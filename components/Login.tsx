import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

interface LoginProps {
  onBack: () => void;
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onBack, onLoginSuccess }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    gsap.fromTo(containerRef.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.8, ease: "power4.out" }
    );
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onLoginSuccess();
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' && !isSignUp) {
        setError('Account not found. Please create an account below.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Incorrect email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Please log in.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed.');
      }
      setIsProcessing(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
      setIsProcessing(false);
    }
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-6">
      <div className="absolute inset-0 opacity-10 grayscale pointer-events-none">
        <div className="absolute inset-0 bg-[url('/images/013A6138-9.jpg')] bg-cover bg-center"></div>
      </div>

      <div className="relative w-full max-w-md">
        <button
          onClick={onBack}
          className="absolute -top-16 left-0 text-[10px] tracking-[0.4em] text-stone-500 hover:text-white transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>BACK TO LEGACY</span>
        </button>

        <div className="bg-stone-900/40 border border-stone-800 p-10 backdrop-blur-xl">
          <div className="text-center mb-10">
            <div className="flex justify-center items-center space-x-2 mb-4">
              <span className="font-athletic text-2xl tracking-tighter text-white">LEGACY</span>
              <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-1"></div>
            </div>
            <h2 className="font-athletic text-xl text-white tracking-widest">
              {isSignUp ? 'CREATE ACCOUNT' : 'MEMBER PORTAL'}
            </h2>
            <p className="text-[10px] text-stone-500 uppercase tracking-widest mt-2">
              {error
                ? <span className="text-red-500">{error}</span>
                : isSignUp ? 'Register your athlete account' : 'Sign in to your account'}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] text-stone-600 uppercase tracking-widest ml-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-stone-950/50 border border-stone-800 px-6 py-4 text-white focus:outline-none focus:border-orange-500 transition-colors uppercase tracking-widest text-[10px]"
                placeholder="athlete@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] text-stone-600 uppercase tracking-widest ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-stone-950/50 border border-stone-800 px-6 py-4 text-white focus:outline-none focus:border-orange-500 transition-colors uppercase tracking-widest text-[10px]"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-4 space-y-4">
              <button
                disabled={isProcessing}
                className="w-full py-4 bg-white text-black font-athletic text-sm tracking-widest hover:bg-orange-600 hover:text-white transition-all duration-500 flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-stone-300 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <span>{isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isProcessing}
                className="w-full py-4 bg-transparent border border-stone-800 text-white font-athletic text-sm tracking-widest hover:bg-stone-800 transition-all duration-500 flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>CONTINUE WITH GOOGLE</span>
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-stone-800 text-center space-y-4">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
              className="text-[9px] text-stone-500 hover:text-white uppercase tracking-widest transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>

            <p className="text-[9px] text-stone-600 uppercase tracking-widest block">
              No session scheduled?{' '}
              <button
                onClick={() => {
                  onBack();
                  setTimeout(() => document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                className="text-stone-400 hover:text-orange-500 transition-colors"
              >
                Book a session
              </button>
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center space-x-8 opacity-20">
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-4 invert" />
          <div className="w-px h-4 bg-stone-800"></div>
          <span className="text-[8px] text-white uppercase tracking-widest self-center">Legacy OS v2.1</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
