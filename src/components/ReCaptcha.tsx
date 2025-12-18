import React, { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { getRecaptchaSiteKey, isRecaptchaConfigured, RECAPTCHA_ERRORS } from '@/lib/recaptcha';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

export interface ReCaptchaRef {
  getToken: () => string | null;
  reset: () => void;
  execute: () => Promise<string | null>;
}

interface ReCaptchaProps {
  onChange?: (token: string | null) => void;
  onExpired?: () => void;
  onError?: () => void;
  className?: string;
}

const ReCaptchaComponent = forwardRef<ReCaptchaRef, ReCaptchaProps>(
  ({ onChange, onExpired, onError, className }, ref) => {
    const recaptchaRef = useRef<ReCAPTCHA>(null);
    const tokenRef = useRef<string | null>(null);
    const siteKey = getRecaptchaSiteKey();

    const handleChange = useCallback((token: string | null) => {
      tokenRef.current = token;
      onChange?.(token);
    }, [onChange]);

    const handleExpired = useCallback(() => {
      tokenRef.current = null;
      onExpired?.();
    }, [onExpired]);

    const handleError = useCallback(() => {
      tokenRef.current = null;
      onError?.();
    }, [onError]);

    useImperativeHandle(ref, () => ({
      getToken: () => tokenRef.current,
      reset: () => {
        tokenRef.current = null;
        recaptchaRef.current?.reset();
      },
      execute: async () => {
        try {
          const token = await recaptchaRef.current?.executeAsync();
          tokenRef.current = token || null;
          return tokenRef.current;
        } catch {
          tokenRef.current = null;
          return null;
        }
      },
    }));

    // If not configured, show nothing (fail open in dev, warning logged)
    if (!isRecaptchaConfigured()) {
      console.warn('reCAPTCHA site key not configured. Skipping reCAPTCHA.');
      return null;
    }

    return (
      <div className={className}>
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={siteKey!}
          onChange={handleChange}
          onExpired={handleExpired}
          onErrored={handleError}
          hl="de"
        />
      </div>
    );
  }
);

ReCaptchaComponent.displayName = 'ReCaptcha';

// Error alert component for reCAPTCHA errors
export function ReCaptchaError({ message }: { message: string }) {
  return (
    <Alert variant="destructive" className="mt-2">
      <ShieldAlert className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export { ReCaptchaComponent as ReCaptcha, RECAPTCHA_ERRORS };
