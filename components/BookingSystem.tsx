import React, { useState, useEffect, useMemo } from "react";
import MagneticButton from "./MagneticButton";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { focusColor } from "../lib/focusColor";
import { useAuth } from "../hooks/useAuth";
import { auth, db } from "../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Session {
  id: string;
  date: string;
  time: string;
  focus: string;
  duration: number;
  spotsAvailable: number;
  isFull: boolean;
  coach: string;
}

// ─── Stripe ───────────────────────────────────────────────────────────────────
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

// ─── Firebase Functions base URL ──────────────────────────────────────────────
// When deployed via Firebase Hosting rewrites, /api/* hits Cloud Functions.
// For local dev, point to deployed URL.
const API_BASE = import.meta.env.VITE_FUNCTIONS_URL || "";
const getApiUrl = (endpoint: string) => API_BASE ? `${API_BASE}/${endpoint}` : `/api/${endpoint}`;

// ─── Payment sub-form ─────────────────────────────────────────────────────────
const SessionPaymentForm = ({
  onSuccess,
  onCancel,
}: {
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (error) {
      setMessage(error.message || "Payment failed");
      setIsProcessing(false);
    } else if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent.id);
    } else {
      setMessage("Unexpected payment state. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: "tabs",
          variables: {
            colorPrimary: "#ea580c",
            colorBackground: "#0c0a09",
            colorText: "#ffffff",
            colorDanger: "#ef4444",
            fontFamily: "Inter, sans-serif",
            borderRadius: "2px",
          },
        }}
      />
      {message && <div className="text-red-500 text-xs">{message}</div>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border border-stone-700 text-stone-400 hover:text-white hover:border-stone-500 transition-colors text-xs uppercase tracking-widest"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isProcessing || !stripe || !elements}
          className={`flex-1 py-4 font-athletic text-base transition-all flex items-center justify-center gap-2
            ${isProcessing ? "bg-stone-800 text-stone-500 cursor-not-allowed" : "bg-white text-black hover:bg-orange-600 hover:text-white"}`}
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-stone-500 border-t-white rounded-full animate-spin" />
              PROCESSING...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              PAY &amp; CONFIRM BOOKING
            </>
          )}
        </button>
      </div>
      <div className="flex items-center justify-center gap-4 opacity-25 grayscale mt-2">
        <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-3" />
        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5" />
      </div>
    </form>
  );
};

// ─── Main BookingSystem Component ─────────────────────────────────────────────
interface BookingSystemProps {
  onLoginRequired: () => void;
}

const BookingSystem: React.FC<BookingSystemProps> = ({ onLoginRequired }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [step, setStep] = useState<"select" | "form" | "payment" | "success">("select");
  const [formData, setFormData] = useState({ name: "", email: user?.email || "" });
  const [filterType, setFilterType] = useState("All");

  // Payment Intent state
  const [clientSecret, setClientSecret] = useState("");
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Booking state
  const [bookingError, setBookingError] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState("");

  const uniqueTypes = useMemo(() => {
    const types = new Set(sessions.map((s) => s.focus));
    return ["All", ...Array.from(types)];
  }, [sessions]);

  const displayedSessions = useMemo(() => {
    if (filterType === "All") return sessions;
    return sessions.filter((s) => s.focus === filterType);
  }, [sessions, filterType]);

  useEffect(() => {
    fetchSessions();
    // Realtime: refetch sessions whenever admin bumps the schedule version
    const unsub = onSnapshot(doc(db, 'schedule_meta', 'version'), () => {
      fetchSessions();
    }, (err) => console.warn('[BookingSystem] schedule_meta listener failed:', err));
    return () => unsub();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('getSessions'));
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToForm = () => {
    if (!selectedSession) return;
    if (!user) { onLoginRequired(); return; }
    setFormData(prev => ({ ...prev, email: user.email || prev.email }));
    setStep("form");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = user?.email || formData.email;
    if (!selectedSession || !formData.name || !email) return;
    setFormData(prev => ({ ...prev, email }));

    setLoadingPayment(true);
    setPaymentError("");

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      // Send session identifiers — server calculates the authoritative price
      const res = await fetch(getApiUrl('createPaymentIntent'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "booking",
          sessionId: selectedSession.id,
          athleteName: formData.name,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.clientSecret) {
        throw new Error(data.error || "Failed to create payment intent");
      }

      setClientSecret(data.clientSecret);
      setStep("payment");
    } catch (err: any) {
      setPaymentError(err.message || "Failed to initialize payment");
    } finally {
      setLoadingPayment(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!selectedSession) return;

    setBookingLoading(true);
    setBookingError("");

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(getApiUrl('createBooking'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: selectedSession.id,
          athleteName: formData.name,
          email: formData.email,
          paymentIntentId,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Booking failed");

      setConfirmedBookingId(data.bookingId);
      setStep("success");
      fetchSessions(); // Refresh to show updated spots
    } catch (err: any) {
      setBookingError(err.message || "Booking failed after payment");
      setStep("form"); // Go back to form
    } finally {
      setBookingLoading(false);
    }
  };

  // ─── Step: Success ───────────────────────────────────────────────────────
  if (step === "success" && selectedSession) {
    return (
      <div className="text-center py-16 bg-stone-900/50 border border-stone-800 rounded-lg p-12">
        <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(234,88,12,0.3)]">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-athletic text-3xl mb-3 text-white uppercase">Session Confirmed</h3>
        <p className="text-stone-400 text-sm max-w-sm mx-auto mb-2">
          A confirmation email with your calendar invite has been sent to{" "}
          <span className="text-white">{formData.email}</span>.
        </p>
        {confirmedBookingId && (
          <p className="text-stone-600 text-xs font-mono mb-6">Booking ID: {confirmedBookingId}</p>
        )}
        <div className="bg-stone-950 border border-stone-800 p-4 mb-8 text-left max-w-sm mx-auto">
          <div className="text-white text-sm font-medium">{selectedSession.date}</div>
          <div className="text-stone-400 text-xs mt-1">{selectedSession.time}</div>
          <div className={`text-xs mt-1 uppercase tracking-widest ${focusColor(selectedSession.focus)}`}>
            {selectedSession.focus}
          </div>
        </div>
        <button
          onClick={() => {
            setStep("select");
            setSelectedSession(null);
            setFormData({ name: "", email: "" });
            setClientSecret("");
            setFilterType("All");
            setConfirmedBookingId("");
          }}
          className="text-orange-500 hover:text-orange-400 text-xs tracking-widest uppercase underline"
        >
          Book Another Session
        </button>
      </div>
    );
  }

  // ─── Step: Payment ───────────────────────────────────────────────────────
  if (step === "payment" && clientSecret && stripePromise && selectedSession) {
    return (
      <div className="max-w-2xl mx-auto bg-stone-900/40 border border-stone-800 rounded-lg p-8 md:p-12">
        <div className="mb-6">
          <span className="text-xs tracking-[0.3em] text-orange-500 uppercase">Step 3 of 3</span>
          <h3 className="font-athletic text-2xl md:text-3xl text-white uppercase mt-1">Secure Payment</h3>
        </div>

        {/* Session summary */}
        <div className="bg-stone-950 border border-stone-800 p-4 mb-6">
          <div className="text-[10px] text-stone-500 uppercase tracking-widest mb-2">Booking For</div>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-white text-sm font-medium">{selectedSession.date}</div>
              <div className="text-stone-400 text-xs">{selectedSession.time}</div>
              <div className={`text-xs mt-1 uppercase tracking-widest ${focusColor(selectedSession.focus)}`}>
                {selectedSession.focus}
              </div>
            </div>
            <div className="text-right">
              <div className="text-white font-athletic text-xl">$49</div>
              <div className="text-stone-500 text-[10px]">SESSION FEE</div>
            </div>
          </div>
          <div className="text-stone-500 text-[10px] mt-2">Athlete: {formData.name} · {formData.email}</div>
        </div>

        {bookingError && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-800 text-red-400 text-xs">
            ⚠️ {bookingError}
          </div>
        )}

        {bookingLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-stone-400 text-xs uppercase tracking-widest">Confirming your booking...</p>
            </div>
          </div>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "night" } }}>
            <SessionPaymentForm
              onSuccess={handlePaymentSuccess}
              onCancel={() => setStep("form")}
            />
          </Elements>
        )}
      </div>
    );
  }

  // ─── Step: Form ──────────────────────────────────────────────────────────
  if (step === "form" && selectedSession) {
    return (
      <div className="max-w-2xl mx-auto bg-stone-900/40 border border-stone-800 rounded-lg p-8 md:p-12">
        <div className="mb-6">
          <span className="text-xs tracking-[0.3em] text-orange-500 uppercase">Step 2 of 3</span>
          <h3 className="font-athletic text-2xl md:text-3xl text-white uppercase mt-1">Your Details</h3>
        </div>

        {/* Selected session recap */}
        <div className="bg-stone-950 border border-stone-800 p-4 mb-6">
          <div className="text-[10px] text-stone-500 uppercase tracking-widest mb-2">Selected Session</div>
          <div className="text-white text-sm font-medium">{selectedSession.date}</div>
          <div className="text-stone-400 text-xs mt-1">{selectedSession.time}</div>
          <div className={`text-xs mt-1 uppercase tracking-widest ${focusColor(selectedSession.focus)}`}>
            {selectedSession.focus}
          </div>
          <button
            onClick={() => setStep("select")}
            className="mt-3 text-stone-500 hover:text-stone-300 text-[10px] uppercase tracking-widest underline"
          >
            Change session
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <input
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            placeholder="ATHLETE FULL NAME"
            className="w-full bg-stone-950 border border-stone-800 px-6 py-4 text-white focus:outline-none focus:border-orange-500 transition-colors uppercase tracking-widest text-xs placeholder:text-stone-600"
          />
          <div className="w-full bg-stone-950 border border-stone-800 px-6 py-4 flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
            <span className="text-stone-300 tracking-widest text-xs">{user?.email}</span>
          </div>

          {paymentError && <div className="text-red-500 text-xs">{paymentError}</div>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep("select")}
              className="px-6 py-4 border border-stone-800 text-stone-400 hover:text-white hover:border-stone-600 transition-colors uppercase tracking-widest text-xs"
            >
              Back
            </button>
            <MagneticButton className="flex-1 !py-4" disabled={loadingPayment}>
              {loadingPayment ? (
                <span className="flex items-center gap-2 justify-center">
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  LOADING...
                </span>
              ) : (
                "PROCEED TO PAYMENT →"
              )}
            </MagneticButton>
          </div>
        </form>
      </div>
    );
  }

  // ─── Step: Select Session ────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto bg-stone-900/40 border border-stone-800 rounded-lg p-8 md:p-12">
      <div className="mb-2">
        <span className="text-xs tracking-[0.3em] text-orange-500 uppercase">Step 1 of 3</span>
        <h3 className="font-athletic text-2xl md:text-4xl text-white uppercase mt-1">Book a Session</h3>
      </div>
      <p className="text-stone-400 text-xs mb-6">Select an available training session. Max {12} athletes per slot.</p>

      {/* Filter */}
      <div className="mb-5 relative">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-full bg-stone-950 border border-stone-800 px-4 py-4 text-white focus:outline-none focus:border-orange-500 transition-colors uppercase tracking-widest text-xs appearance-none cursor-pointer"
        >
          {uniqueTypes.map((type) => (
            <option key={type} value={type}>
              {type === "All" ? "ALL CLASS TYPES" : type}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-stone-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Session List */}
      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar mb-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayedSessions.length === 0 ? (
          <p className="text-stone-500 text-center py-8 text-sm">No upcoming sessions for this type.</p>
        ) : (
          displayedSessions.map((session) => {
            const isSelected = selectedSession?.id === session.id;
            return (
              <button
                key={session.id}
                onClick={() => !session.isFull && setSelectedSession(isSelected ? null : session)}
                disabled={session.isFull}
                className={`w-full text-left p-4 border transition-all flex justify-between items-center
                  ${session.isFull
                    ? "border-stone-800 bg-stone-950/30 opacity-40 cursor-not-allowed"
                    : isSelected
                      ? "border-orange-500 bg-orange-500/10 shadow-[0_0_20px_rgba(234,88,12,0.1)]"
                      : "border-stone-800 bg-stone-950/50 hover:border-stone-600 hover:bg-stone-900 cursor-pointer"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 border flex items-center justify-center flex-shrink-0 transition-colors
                      ${isSelected ? "bg-orange-500 border-orange-500" : "border-stone-600"}`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">
                      {session.date}{" "}
                      <span className="text-stone-500 font-normal">@ {session.time.split("–")[0].trim()}</span>
                    </div>
                    <div className={`text-xs tracking-widest uppercase mt-0.5 ${focusColor(session.focus)}`}>
                      {session.focus}
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  {session.isFull ? (
                    <span className="text-red-500 text-xs font-bold uppercase tracking-wider">FULL</span>
                  ) : (
                    <span className="text-stone-500 text-xs uppercase tracking-wider">
                      {session.spotsAvailable} left
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center border-t border-stone-800 pt-5">
        <div className="text-stone-500 text-xs">
          {selectedSession ? (
            <span className="text-stone-300">
              {selectedSession.date} selected
            </span>
          ) : (
            "Select a session to continue"
          )}
        </div>
        <MagneticButton
          onClick={handleContinueToForm}
          disabled={!selectedSession}
          className="!py-3 !px-8"
        >
          CONTINUE →
        </MagneticButton>
      </div>
    </div>
  );
};

export default BookingSystem;
