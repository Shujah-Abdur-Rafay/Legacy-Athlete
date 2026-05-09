import { useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

/**
 * Logs out the authenticated user after IDLE_TIMEOUT_MS of inactivity.
 * Only active when `isLoggedIn` is true.
 */
export const useIdleLogout = (isLoggedIn: boolean): void => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        console.log('[useIdleLogout] Session timed out due to inactivity.');
        await signOut(auth);
      }, IDLE_TIMEOUT_MS);
    };

    // Start the timer and listen for activity
    reset();
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [isLoggedIn]);
};
