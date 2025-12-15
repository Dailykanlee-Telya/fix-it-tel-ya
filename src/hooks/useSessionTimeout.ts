import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Default timeout in minutes (fallback if DB setting not available)
const DEFAULT_TIMEOUT_MINUTES = 15;
// Warning before logout (1 minute before)
const WARNING_BEFORE_LOGOUT = 60 * 1000;

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [timeoutMinutes, setTimeoutMinutes] = useState(DEFAULT_TIMEOUT_MINUTES);

  // Fetch timeout setting from database
  useEffect(() => {
    const fetchTimeoutSetting = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'session_timeout_minutes')
          .single();

        if (!error && data?.value) {
          const minutes = typeof data.value === 'number' ? data.value : parseInt(String(data.value), 10);
          if (!isNaN(minutes) && minutes > 0) {
            setTimeoutMinutes(minutes);
          }
        }
      } catch (err) {
        // Use default if fetch fails
        console.log('Using default session timeout');
      }
    };

    if (user) {
      fetchTimeoutSetting();
    }
  }, [user]);

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    clearAllTimers();
    setShowWarning(false);
    
    toast({
      title: 'Automatisch abgemeldet',
      description: 'Sie wurden aus Sicherheitsgründen wegen Inaktivität abgemeldet.',
    });
    
    await signOut();
  }, [signOut, toast, clearAllTimers]);

  const startCountdown = useCallback(() => {
    setSecondsRemaining(60);
    setShowWarning(true);
    
    countdownRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const resetTimer = useCallback(() => {
    if (!user) return;
    
    clearAllTimers();
    setShowWarning(false);
    setSecondsRemaining(60);

    const inactivityTimeout = timeoutMinutes * 60 * 1000;

    // Set warning timer
    warningRef.current = setTimeout(() => {
      startCountdown();
    }, inactivityTimeout - WARNING_BEFORE_LOGOUT);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, inactivityTimeout);
  }, [user, handleLogout, clearAllTimers, startCountdown, timeoutMinutes]);

  const extendSession = useCallback(() => {
    setShowWarning(false);
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!user) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    // Events that indicate user activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      // Only reset if warning is not showing (to prevent accidental dismiss)
      if (!showWarning) {
        resetTimer();
      }
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearAllTimers();
    };
  }, [user, resetTimer, clearAllTimers, showWarning]);

  return {
    showWarning,
    secondsRemaining,
    extendSession,
    logout: handleLogout,
    timeoutMinutes,
  };
}
