import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';

/**
 * Reads the `admin` custom claim from the user's Firebase ID token.
 * Returns true only when the token has been verified server-side to carry
 * the `admin: true` claim set by the setAdminClaim Cloud Function.
 *
 * Forces a token refresh on mount so stale cached tokens are not trusted.
 */
export const useAdminClaim = (user: User | null): boolean => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    // Force refresh to ensure claims are current (not from a cached token)
    user.getIdTokenResult(true).then((result) => {
      setIsAdmin(result.claims.admin === true);
    }).catch(() => {
      setIsAdmin(false);
    });
  }, [user]);

  return isAdmin;
};
