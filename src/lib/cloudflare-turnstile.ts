/**
 * Cloudflare Turnstile Integration
 * Open-source CAPTCHA alternative for human verification
 * Better than reCAPTCHA - privacy-focused and faster
 */

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!;
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY!;

export interface TurnstileVerificationResult {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  action?: string;
  cdata?: string;
}

/**
 * Verify Turnstile token on server-side
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<TurnstileVerificationResult> {
  try {
    const formData = new URLSearchParams();
    formData.append('secret', TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    if (!response.ok) {
      throw new Error('Turnstile verification request failed');
    }

    const result: TurnstileVerificationResult = await response.json();
    return result;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return {
      success: false,
      'error-codes': ['internal-error'],
    };
  }
}

/**
 * Middleware to verify Turnstile token
 */
export async function requireTurnstileVerification(
  token: string | null,
  remoteIp?: string
): Promise<boolean> {
  if (!token) {
    throw new Error('Turnstile token is required');
  }

  const result = await verifyTurnstileToken(token, remoteIp);

  if (!result.success) {
    const errorCodes = result['error-codes'] || [];
    throw new Error(`Turnstile verification failed: ${errorCodes.join(', ')}`);
  }

  return true;
}

/**
 * Get Turnstile site key for client-side
 */
export function getTurnstileSiteKey(): string {
  return TURNSTILE_SITE_KEY;
}

/**
 * Check if Turnstile is enabled
 */
export function isTurnstileEnabled(): boolean {
  return !!(TURNSTILE_SITE_KEY && TURNSTILE_SECRET_KEY);
}

/**
 * Get error message from error codes
 */
export function getTurnstileErrorMessage(errorCodes: string[]): string {
  const errorMessages: Record<string, string> = {
    'missing-input-secret': 'The secret parameter was not passed.',
    'invalid-input-secret': 'The secret parameter was invalid or did not exist.',
    'missing-input-response': 'The response parameter was not passed.',
    'invalid-input-response': 'The response parameter is invalid or has expired.',
    'bad-request': 'The request was rejected because it was malformed.',
    'timeout-or-duplicate': 'The response parameter has already been validated before.',
    'internal-error': 'An internal error happened while validating the response.',
  };

  return errorCodes
    .map((code) => errorMessages[code] || 'Unknown error')
    .join(', ');
}

/**
 * Rate limiting with Turnstile
 * Combines Turnstile verification with rate limiting
 */
export async function verifyWithRateLimit(
  token: string,
  userId: string,
  action: string,
  remoteIp?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    // Verify Turnstile token
    const turnstileResult = await verifyTurnstileToken(token, remoteIp);

    if (!turnstileResult.success) {
      return {
        success: false,
        message: getTurnstileErrorMessage(turnstileResult['error-codes'] || []),
      };
    }

    // Additional rate limiting logic can be added here
    // For example, check database for user's recent actions

    return { success: true };
  } catch (error) {
    console.error('Verification with rate limit error:', error);
    return {
      success: false,
      message: 'Verification failed. Please try again.',
    };
  }
}

/**
 * Turnstile configuration for different scenarios
 */
export const TurnstileConfig = {
  // For image upload
  upload: {
    action: 'upload',
    theme: 'dark',
    size: 'normal',
  },
  // For payment
  payment: {
    action: 'payment',
    theme: 'dark',
    size: 'normal',
  },
  // For account creation
  signup: {
    action: 'signup',
    theme: 'dark',
    size: 'normal',
  },
  // For API requests
  api: {
    action: 'api',
    theme: 'dark',
    size: 'compact',
  },
};

/**
 * Client-side Turnstile widget loader
 */
export const TurnstileScript = `
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
`;

/**
 * Generate Turnstile widget HTML
 */
export function generateTurnstileWidget(
  action: keyof typeof TurnstileConfig = 'upload'
): string {
  const config = TurnstileConfig[action];
  
  return `
    <div 
      class="cf-turnstile" 
      data-sitekey="${TURNSTILE_SITE_KEY}"
      data-action="${config.action}"
      data-theme="${config.theme}"
      data-size="${config.size}"
      data-callback="onTurnstileSuccess"
      data-error-callback="onTurnstileError"
      data-expired-callback="onTurnstileExpired"
    ></div>
  `;
}

/**
 * Turnstile analytics
 */
export async function logTurnstileVerification(
  userId: string,
  action: string,
  success: boolean,
  errorCodes?: string[]
) {
  try {
    // Log to analytics service or database
    const logData = {
      userId,
      action,
      success,
      errorCodes: errorCodes || [],
      timestamp: new Date().toISOString(),
    };

    // This would integrate with your analytics service
    console.log('Turnstile verification log:', logData);
  } catch (error) {
    console.error('Failed to log Turnstile verification:', error);
  }
}
