
import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { PRICING_TIERS } from '../constants';
import MagneticButton from './MagneticButton';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../lib/firebase';

// Initialize Stripe
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const API_BASE = import.meta.env.VITE_FUNCTIONS_URL || "";
const getApiUrl = (endpoint: string) => API_BASE ? `${API_BASE}/${endpoint}` : `/api/${endpoint}`;

const CheckoutForm = ({ amount, onSuccess }: { amount: number, onSuccess: (id: string) => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, // We'll handle success in place if possible, or redirect
      },
      redirect: 'if_required',
    });

    if (error) {
      setMessage(error.message || 'An unexpected error occurred.');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setMessage('Payment succeeded!');
      onSuccess(paymentIntent.id);
      setIsProcessing(false);
    } else {
      setMessage('Unexpected state.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement 
        options={{
          layout: 'tabs',
          theme: 'night',
          variables: {
            colorPrimary: '#ea580c',
            colorBackground: '#1c1917',
            colorText: '#ffffff',
            colorDanger: '#ef4444',
            fontFamily: 'Inter, sans-serif',
            borderRadius: '2px',
          }
        }} 
      />
      
      {message && <div className="text-red-500 text-xs mt-2">{message}</div>}

      <button 
        disabled={isProcessing || !stripe || !elements}
        className={`w-full py-4 font-athletic text-lg transition-all duration-300 relative overflow-hidden flex items-center justify-center space-x-3 
          ${isProcessing ? 'bg-stone-800 cursor-not-allowed text-stone-500' : 'bg-white text-black hover:bg-orange-600 hover:text-white'}`}
      >
        {isProcessing ? (
          <>
            <div className="w-4 h-4 border-2 border-stone-500 border-t-white rounded-full animate-spin"></div>
            <span>PROCESSING...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>PAY ${typeof amount === 'number' ? amount.toFixed(2).replace(/\.00$/, '') : amount} & ACCESS LAB</span>
          </>
        )}
      </button>
      
      <div className="mt-6 flex items-center justify-center space-x-6 opacity-30 grayscale">
        <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-3" />
        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
        <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="Paypal" className="h-4" />
      </div>
    </form>
  );
};

interface PaymentProps {
  initialPlanId?: string;
  onLoginRequired: () => void;
}

const Payment: React.FC<PaymentProps> = ({ initialPlanId, onLoginRequired }) => {
  const { user } = useAuth();
  const recommendedPlan = PRICING_TIERS.find(t => t.recommended) || PRICING_TIERS[0];
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId || recommendedPlan.id);
  const [addPerformance, setAddPerformance] = useState(false);
  const [is8WeekBundle, setIs8WeekBundle] = useState(false);

  const [clientSecret, setClientSecret] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  // Server-authoritative total returned by createPaymentIntent (cents → dollars)
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  // Prevent handleSuccess from being called twice on network retries
  const successFiredRef = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Reset plan selection when initialPlanId triggers a login-required redirect
  const handlePlanSelect = (planId: string) => {
    if (!user) { onLoginRequired(); return; }
    setSelectedPlanId(planId);
  };

  useEffect(() => {
    if (initialPlanId) {
      setSelectedPlanId(initialPlanId);
    }
  }, [initialPlanId]);

  const selectedPlan = PRICING_TIERS.find(t => t.id === selectedPlanId) || recommendedPlan;

  // Calculate totals
  const basePrice = parseFloat(selectedPlan.price);
  const performancePrice = (addPerformance && selectedPlan.id !== 'performance-solo') ? (selectedPlan.id === 'drop-in' ? 35 : 79) : 0;
  const months = is8WeekBundle && selectedPlan.id !== 'drop-in' ? 2 : 1;
  const subtotal = (basePrice + performancePrice) * months;
  const discount = is8WeekBundle && selectedPlan.id !== 'drop-in' ? subtotal * 0.10 : 0;
  const subtotalAfterDiscount = subtotal - discount;
  const tax = subtotalAfterDiscount * 0.1025; // 10.25% IL Sales Tax
  const total = subtotalAfterDiscount + tax;

  useEffect(() => {
    gsap.fromTo(sectionRef.current,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 1,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        }
      }
    );
  }, []);

  useEffect(() => {
    // Create a PaymentIntent whenever the plan config changes — only for logged-in users.
    // Sends plan identifiers (not client-computed price) so the server calculates the
    // authoritative charge amount. Uses AbortController to cancel in-flight requests
    // when the user changes their selection before the response arrives.
    if (!stripeKey || !user) return;

    setClientSecret(''); // show spinner while new PI loads
    const controller = new AbortController();

    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token || controller.signal.aborted) return;

        const res = await fetch(getApiUrl('createPaymentIntent'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: 'plan',
            planId: selectedPlanId,
            addPerformance,
            is8Week: is8WeekBundle,
          }),
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;
        const data = await res.json();
        if (!controller.signal.aborted && data.clientSecret) {
          setClientSecret(data.clientSecret);
          if (typeof data.amount === 'number') {
            setServerTotal(data.amount / 100); // cents → dollars
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('Error creating payment intent:', err);
      }
    })();

    return () => controller.abort();
  }, [selectedPlanId, addPerformance, is8WeekBundle, user]);

  const handleSuccess = async (id: string) => {
    // Idempotency guard — stripe.confirmPayment can occasionally fire onSuccess twice
    if (successFiredRef.current) return;
    successFiredRef.current = true;

    setTransactionId(id);
    setPaymentSuccess(true);
    gsap.fromTo(".success-msg", { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" });

    // Send receipt to athlete and notify coach
    const email = user?.email;
    if (email) {
      const addons: string[] = [];
      if (addPerformance && selectedPlan.id !== 'performance-solo') {
        addons.push(`Performance Add-on (+$${selectedPlan.id === 'drop-in' ? '35' : '79'})`);
      }
      if (is8WeekBundle && selectedPlan.id !== 'drop-in') {
        addons.push('8-Week Bundle (10% off)');
      }
      try {
        const token = await auth.currentUser?.getIdToken();
        await fetch(getApiUrl('confirmPlanPurchase'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            email,
            planName: selectedPlan.name,
            amount: serverTotal ?? total, // prefer server-authoritative total
            transactionId: id,
            addons,
            is8Week: is8WeekBundle,
          }),
        });
      } catch (err) {
        console.error('Failed to send plan purchase email:', err);
      }
    }
  };

  if (paymentSuccess) {
    return (
      <section className="py-32 px-8 bg-stone-950 flex items-center justify-center min-h-[600px]">
        <div className="success-msg w-full max-w-lg bg-stone-900/40 border border-stone-800 p-8 md:p-12 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 via-stone-700 to-orange-600"></div>
          
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-green-500/10 border border-green-500/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-athletic text-3xl text-white mb-2">ENROLLMENT CONFIRMED</h2>
            <p className="text-stone-500 text-[10px] uppercase tracking-widest">
              Your spot in the {selectedPlan.name} cohort is secured.
            </p>
          </div>

          <div className="space-y-4 mb-10 border-t border-b border-stone-800 py-8 bg-black/20 -mx-8 px-8">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-stone-500 uppercase tracking-widest">Selected Plan</span>
              <span className="font-athletic text-white text-lg">{selectedPlan.name}</span>
            </div>
            {addPerformance && (
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-stone-500 uppercase tracking-widest">Add-on</span>
                <span className="font-athletic text-white text-lg">Performance</span>
              </div>
            )}
            {is8WeekBundle && (
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-stone-500 uppercase tracking-widest">Duration</span>
                <span className="font-athletic text-white text-lg">2 Months (8-Week)</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-stone-500 uppercase tracking-widest">Amount Paid</span>
              <span className="font-athletic text-white text-lg">
                ${(serverTotal ?? total).toFixed(2).replace(/\.00$/, '')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-stone-500 uppercase tracking-widest">Transaction ID</span>
              <span className="text-stone-300 font-mono text-xs">{transactionId}</span>
            </div>
             <div className="flex justify-between items-center">
              <span className="text-[10px] text-stone-500 uppercase tracking-widest">Date</span>
              <span className="text-stone-300 font-mono text-xs">{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <p className="text-stone-400 text-xs leading-relaxed text-center mb-8">
            A receipt has been sent to your email. You can now access your athlete dashboard to begin the onboarding protocol.
          </p>

          <MagneticButton 
            className="w-full"
            onClick={() => setPaymentSuccess(false)}
          >
            ACCESS DASHBOARD
          </MagneticButton>
        </div>
      </section>
    );
  }

  return (
    <section id="payment" ref={sectionRef} className="py-32 px-8 bg-black border-t border-stone-900">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
          
          {/* Summary Side */}
          <div className="space-y-12">
            <div>
              <span className="text-[10px] tracking-[0.4em] text-orange-500 uppercase block mb-4">Secure Checkout</span>
              <h2 className="font-athletic text-5xl md:text-7xl text-white mb-6">FINALIZE <br /><span className="text-stone-500">ACCESS</span></h2>
              <p className="text-stone-400 text-sm uppercase tracking-wider leading-relaxed max-w-md">
                Secure your position in the upcoming cohort. All payments are encrypted and processed via Stripe global infrastructure.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] tracking-[0.3em] text-stone-500 uppercase">Selected Protocol</h4>
              <div className="bg-stone-900/40 border border-stone-800 p-6 rounded-sm flex flex-col space-y-4">
                <select 
                  value={selectedPlanId} 
                  onChange={(e) => {
                    setSelectedPlanId(e.target.value);
                    if (e.target.value === 'drop-in') {
                      setIs8WeekBundle(false);
                    }
                  }}
                  className="w-full bg-black border border-stone-800 text-white p-3 font-athletic text-xl focus:outline-none focus:border-orange-600 transition-colors"
                >
                  {PRICING_TIERS.map(tier => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name} - ${tier.price}{tier.id !== 'drop-in' ? '/mo' : ''}
                    </option>
                  ))}
                </select>

                <div className="space-y-3 pt-4 border-t border-stone-800/50">
                  {selectedPlan.id !== 'performance-solo' && (
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <div className={`w-5 h-5 border flex items-center justify-center transition-colors ${addPerformance ? 'bg-orange-500 border-orange-500' : 'border-stone-600 group-hover:border-orange-500'}`}>
                        {addPerformance && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <input type="checkbox" className="hidden" checked={addPerformance} onChange={(e) => setAddPerformance(e.target.checked)} />
                      <span className="text-xs text-stone-300 uppercase tracking-widest">
                        Performance Add-on (+${selectedPlan.id === 'drop-in' ? '35' : '79'}{selectedPlan.id !== 'drop-in' ? '/mo' : ''})
                      </span>
                    </label>
                  )}

                  {selectedPlan.id !== 'drop-in' && (
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <div className={`w-5 h-5 border flex items-center justify-center transition-colors ${is8WeekBundle ? 'bg-orange-500 border-orange-500' : 'border-stone-600 group-hover:border-orange-500'}`}>
                        {is8WeekBundle && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <input type="checkbox" className="hidden" checked={is8WeekBundle} onChange={(e) => setIs8WeekBundle(e.target.checked)} />
                      <span className="text-xs text-stone-300 uppercase tracking-widest">
                        8-Week Bundle (2 Months) - Save 10%
                      </span>
                    </label>
                  )}
                </div>

                <div className="space-y-2 pt-4 border-t border-stone-800/50">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-stone-500 uppercase tracking-widest">Base Plan</span>
                    <span className="text-xs text-stone-300 font-mono">${basePrice.toFixed(2).replace(/\.00$/, '')}</span>
                  </div>
                  {addPerformance && selectedPlan.id !== 'performance-solo' && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-stone-500 uppercase tracking-widest">Performance Add-on</span>
                      <span className="text-xs text-stone-300 font-mono">${performancePrice.toFixed(2).replace(/\.00$/, '')}</span>
                    </div>
                  )}
                  {is8WeekBundle && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-stone-500 uppercase tracking-widest">Duration</span>
                        <span className="text-xs text-stone-300 font-mono">x 2 Months</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-orange-500 uppercase tracking-widest">10% Bundle Discount</span>
                        <span className="text-xs text-orange-500 font-mono">-${discount.toFixed(2).replace(/\.00$/, '')}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-stone-500 uppercase tracking-widest">IL Sales Tax (10.25%)</span>
                    <span className="text-xs text-stone-300 font-mono">${tax.toFixed(2).replace(/\.00$/, '')}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-stone-800/50">
                  <div>
                    <p className="text-[10px] text-stone-500 uppercase tracking-widest">Total Due Today</p>
                  </div>
                  <div className="text-right">
                    <span className="font-athletic text-3xl text-white">${total.toFixed(2).replace(/\.00$/, '')}</span>
                    <p className="text-[8px] text-stone-600 uppercase tracking-widest">USD {is8WeekBundle ? 'Paid in Full' : (selectedPlan.id === 'drop-in' ? 'One-Time' : 'Monthly')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 border border-stone-800 flex items-center justify-center grayscale opacity-50">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
                </div>
                <span className="text-[9px] text-stone-500 uppercase tracking-widest leading-tight">SSL Encrypted Checkout</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 border border-stone-800 flex items-center justify-center grayscale opacity-50">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                </div>
                <span className="text-[9px] text-stone-500 uppercase tracking-widest leading-tight">Fraud Protection Enabled</span>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div ref={formRef} className="bg-stone-900/30 border border-stone-800 p-8 md:p-12 relative overflow-hidden min-h-[500px]">
            <div className="mb-10 flex items-center justify-between">
               <div className="flex items-center space-x-2">
                 <div className={`w-2 h-2 rounded-full ${stripeKey ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                 <span className="text-[9px] text-stone-400 uppercase tracking-[0.2em]">
                   {stripeKey ? 'Secure Stripe Connection Active' : 'Payment System Offline'}
                 </span>
               </div>
               <div className="h-4">
                 <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-full invert opacity-30" />
               </div>
            </div>

            {/* ── Login wall ── */}
            {!user ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-14 h-14 border border-stone-700 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-500">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="font-athletic text-xl text-white mb-2">Login Required</h3>
                <p className="text-stone-500 text-xs max-w-xs mx-auto mb-8 uppercase tracking-wider leading-relaxed">
                  Create an account or sign in to complete your purchase and access your athlete dashboard.
                </p>
                <button
                  onClick={onLoginRequired}
                  className="px-10 py-4 bg-orange-600 text-white font-athletic text-sm tracking-widest hover:bg-orange-500 transition-colors"
                >
                  SIGN IN TO CONTINUE
                </button>
              </div>
            ) : !stripeKey ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 border border-stone-800 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-600">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="font-athletic text-xl text-white mb-2">Configuration Required</h3>
                <p className="text-stone-500 text-xs max-w-xs mx-auto mb-6">
                  Stripe API keys are missing. Please configure your environment variables to enable payments.
                </p>
                <div className="bg-stone-950 p-4 rounded border border-stone-800 text-left text-[10px] font-mono text-stone-400 overflow-x-auto">
                  VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...<br/>
                  STRIPE_SECRET_KEY=sk_test_...
                </div>
              </div>
            ) : (
              clientSecret && stripePromise ? (
                <>
                  <div className="mb-6 flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest">Receipt will be sent to {user.email}</span>
                  </div>
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                    <CheckoutForm amount={total} onSuccess={handleSuccess} />
                  </Elements>
                </>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Payment;
