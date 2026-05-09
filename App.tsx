
import React, { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Programs from './components/Programs';
import Stats from './components/Stats';
import BookingSystem from './components/BookingSystem';
import Pricing from './components/Pricing';
import Roadmap from './components/Roadmap';
import Footer from './components/Footer';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import Philosophy from './components/Philosophy';
import TrackableProgress from './components/TrackableProgress';
import TheGap from './components/TheGap';
import SummerCamp from './components/SummerCamp';
import FAQ from './components/FAQ';
import History from './components/History';
import Location from './components/Location';
import Payment from './components/Payment';
import CancellationPage from './components/CancellationPage';
import { useAuth } from './hooks/useAuth';
import { auth } from './lib/firebase';
import { useAdminClaim } from './hooks/useAdminClaim';
import { useIdleLogout } from './hooks/useIdleLogout';
import ErrorBoundary from './components/ErrorBoundary';

gsap.registerPlugin(ScrollTrigger);

// Admin status is determined by Firebase custom claims (token.admin == true).
// Set admin claims via the setAdminClaim Cloud Function — never hardcode emails.

const Connector = () => (
  <div className="w-full flex justify-center bg-black overflow-hidden relative z-10">
    <div className="h-24 w-px bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900/0"></div>
  </div>
);

function App() {
  const { user, loading } = useAuth();
  const isAdmin = useAdminClaim(user);
  useIdleLogout(!!user);
  const [showLogin, setShowLogin] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);

  useEffect(() => {
    ScrollTrigger.config({
      autoRefreshEvents: "visibilitychange,DOMContentLoaded,load,resize"
    });

    gsap.to('body', { opacity: 1, duration: 1.5, ease: "power2.out" });

    const titles = gsap.utils.toArray('.section-title');
    titles.forEach((title: any) => {
      gsap.fromTo(title,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: title,
            start: "top 85%",
          }
        }
      );
    });
  }, []);

  if (typeof window !== 'undefined' && window.location.pathname === '/cancel') {
    return <CancellationPage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-stone-800 border-t-orange-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user && showDashboard) {
    if (isAdmin) {
      return <AdminPanel />;
    }
    return <Dashboard
      onLogout={() => {
        import('firebase/auth').then(({ signOut }) => signOut(auth));
        setShowDashboard(true);
      }}
      onBackToSite={() => setShowDashboard(false)}
    />;
  }

  if (showLogin) {
    return <Login
      onBack={() => setShowLogin(false)}
      onLoginSuccess={() => { setShowLogin(false); setShowDashboard(true); }}
    />;
  }

  const handleLoginRequired = () => setShowLogin(true);
  const handleConsoleClick = () => setShowDashboard(true);

  return (
    <main className="bg-black min-h-screen text-white selection:bg-orange-600 selection:text-white">
      <Navbar
        onPortalClick={user ? handleConsoleClick : handleLoginRequired}
        onLoginClick={handleLoginRequired}
        isLoggedIn={!!user}
        onConsoleClick={handleConsoleClick}
      />
      <Hero />
      <Stats />
      
      {/* The Problem / Solution */}
      <TheGap />

      <Connector />

      {/* Philosophy & Goals */}
      <Philosophy />
      
      <Connector />

      {/* Trackable Progress */}
      <TrackableProgress />

      <Connector />

      {/* Who This Is For Section */}
      <section className="py-32 px-8 bg-black">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-xs tracking-[0.4em] text-orange-500 uppercase mb-4 block">No Prior Experience Required</span>
            <h2 className="section-title font-athletic text-5xl md:text-7xl mb-8 leading-tight">
              WHO THIS <br />
              <span className="text-stone-500">IS FOR.</span>
            </h2>
            <div className="space-y-6 max-w-xl">
              <p className="text-stone-400 text-sm md:text-base leading-relaxed uppercase tracking-wider">
                Our first session is designed for athletes who are new to Legacy.
                Whether you are a beginner or an advanced player, this is where you start.
              </p>
              <ul className="space-y-4 border-l border-orange-600 pl-6 mt-8">
                <li className="text-stone-300 text-xs md:text-sm uppercase tracking-widest">• Ages 11–18+</li>
                <li className="text-stone-300 text-xs md:text-sm uppercase tracking-widest">• Beginners through advanced players</li>
                <li className="text-stone-300 text-xs md:text-sm uppercase tracking-widest">• Boys and girls</li>
                <li className="text-stone-300 text-xs md:text-sm uppercase tracking-widest">• New to structured performance training</li>
              </ul>
            </div>
          </div>
          <div className="relative aspect-video lg:aspect-square overflow-hidden rounded-lg group">
             <img 
               src="/images/013A5807-45.jpg" 
               className="w-full h-full object-cover grayscale opacity-60 group-hover:scale-105 transition-transform duration-1000" 
               alt="Young Athlete Training"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
             <div className="absolute bottom-8 left-8">
               <span className="font-athletic text-2xl text-white">START YOUR JOURNEY</span>
             </div>
          </div>
        </div>
      </section>

      <Connector />

      <SummerCamp onSelectPlan={setSelectedPlanId} />

      <Connector />

      {/* What Happens */}
      <Programs />

      <Connector />

      {/* History / Naismith */}
      <History />
      
      <Connector />
      
      {/* Location */}
      <Location />

      <Connector />
      
      {/* Pricing / First Session Details */}
      <Pricing onSelectPlan={setSelectedPlanId} />

      <Connector />

      {/* What Happens After */}
      <Roadmap />
      
      <Payment initialPlanId={selectedPlanId} onLoginRequired={handleLoginRequired} />

      <Connector />

      <section id="apply" className="py-32 px-8 bg-black relative scroll-mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <span className="text-xs tracking-[0.4em] text-orange-500 uppercase mb-4 block">Book Now</span>
            <h2 className="section-title font-athletic text-5xl md:text-8xl text-white mb-8 leading-none">
              RESERVE YOUR <br /> SPOT
            </h2>
            <p className="text-stone-500 text-sm md:text-lg mb-12 leading-relaxed">
              Select a time to come in for your first coached session. We'll handle the rest.
            </p>
            <div className="space-y-6 border-t border-stone-900 pt-8">
              <div className="flex items-start space-x-4">
                <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2" />
                <p className="text-stone-400 text-xs uppercase tracking-widest">Instant Confirmation</p>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2" />
                <p className="text-stone-400 text-xs uppercase tracking-widest">Direct Coach Communication</p>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2" />
                <p className="text-stone-400 text-xs uppercase tracking-widest">Safe & Secure Booking</p>
              </div>
            </div>
          </div>
          
          <BookingSystem onLoginRequired={handleLoginRequired} />
        </div>
      </section>

      <Connector />

      {/* Parents FAQ */}
      <FAQ />

      <Footer onPortalClick={user ? handleConsoleClick : handleLoginRequired} />
    </main>
  );
}

export default App;
