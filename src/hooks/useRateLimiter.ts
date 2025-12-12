import { useState, useCallback, useRef, useEffect } from 'react';

interface RateLimiterConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

interface RateLimiterState {
  attempts: number;
  firstAttemptTime: number | null;
  lockedUntil: number | null;
}

const STORAGE_KEY_PREFIX = 'rate_limit_';

export function useRateLimiter(key: string, config: RateLimiterConfig) {
  const { maxAttempts, windowMs, lockoutMs } = config;
  
  const getStoredState = (): RateLimiterState => {
    try {
      const stored = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`);
      if (stored) {
        const state = JSON.parse(stored);
        // Clean up expired state
        const now = Date.now();
        if (state.lockedUntil && state.lockedUntil <= now) {
          return { attempts: 0, firstAttemptTime: null, lockedUntil: null };
        }
        if (state.firstAttemptTime && now - state.firstAttemptTime > windowMs) {
          return { attempts: 0, firstAttemptTime: null, lockedUntil: null };
        }
        return state;
      }
    } catch {
      // Ignore storage errors
    }
    return { attempts: 0, firstAttemptTime: null, lockedUntil: null };
  };

  const [state, setState] = useState<RateLimiterState>(getStoredState);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Persist state to sessionStorage
  const persistState = useCallback((newState: RateLimiterState) => {
    try {
      sessionStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, JSON.stringify(newState));
    } catch {
      // Ignore storage errors
    }
  }, [key]);

  // Update remaining lockout time
  useEffect(() => {
    if (state.lockedUntil) {
      const updateRemaining = () => {
        const now = Date.now();
        const remaining = Math.max(0, state.lockedUntil! - now);
        setRemainingTime(remaining);
        
        if (remaining <= 0) {
          const newState = { attempts: 0, firstAttemptTime: null, lockedUntil: null };
          setState(newState);
          persistState(newState);
        }
      };

      updateRemaining();
      timerRef.current = setInterval(updateRemaining, 1000);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    } else {
      setRemainingTime(0);
    }
  }, [state.lockedUntil, persistState]);

  const recordAttempt = useCallback((success: boolean) => {
    const now = Date.now();
    
    // If locked, don't record
    if (state.lockedUntil && state.lockedUntil > now) {
      return;
    }

    if (success) {
      // Reset on success
      const newState = { attempts: 0, firstAttemptTime: null, lockedUntil: null };
      setState(newState);
      persistState(newState);
      return;
    }

    // Record failed attempt
    let newAttempts = state.attempts + 1;
    let newFirstAttemptTime = state.firstAttemptTime || now;

    // Reset window if expired
    if (state.firstAttemptTime && now - state.firstAttemptTime > windowMs) {
      newAttempts = 1;
      newFirstAttemptTime = now;
    }

    const newState: RateLimiterState = {
      attempts: newAttempts,
      firstAttemptTime: newFirstAttemptTime,
      lockedUntil: newAttempts >= maxAttempts ? now + lockoutMs : null,
    };

    setState(newState);
    persistState(newState);
  }, [state, maxAttempts, windowMs, lockoutMs, persistState]);

  const isLocked = state.lockedUntil !== null && state.lockedUntil > Date.now();
  const attemptsRemaining = Math.max(0, maxAttempts - state.attempts);
  const lockoutSeconds = Math.ceil(remainingTime / 1000);

  const reset = useCallback(() => {
    const newState = { attempts: 0, firstAttemptTime: null, lockedUntil: null };
    setState(newState);
    persistState(newState);
  }, [persistState]);

  return {
    isLocked,
    attemptsRemaining,
    lockoutSeconds,
    remainingTime,
    recordAttempt,
    reset,
    attempts: state.attempts,
  };
}

// Default configuration for auth
export const AUTH_RATE_LIMIT_CONFIG: RateLimiterConfig = {
  maxAttempts: 5,      // 5 failed attempts
  windowMs: 5 * 60 * 1000,  // within 5 minutes
  lockoutMs: 15 * 60 * 1000, // lockout for 15 minutes
};
