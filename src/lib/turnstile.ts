// Cloudflare Turnstile utilities stub
export interface TurnstileVerificationResult {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
  action?: string;
  cdata?: string;
}

class TurnstileService {
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.TURNSTILE_SECRET_KEY || '';
  }

  async verifyToken(token: string, remoteip?: string): Promise<TurnstileVerificationResult> {
    if (!this.secretKey) {
      console.warn('TURNSTILE_SECRET_KEY not configured, skipping verification');
      return { success: true }; // Allow in development
    }

    try {
      // Stub implementation - replace with actual Turnstile API call
      console.log('Turnstile verification:', { token: token.substring(0, 10) + '...', remoteip });
      
      // Simulate API call to Cloudflare
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: this.secretKey,
          response: token,
          ...(remoteip && { remoteip })
        })
      });

      const result = await response.json() as TurnstileVerificationResult;
      return result;
    } catch (error) {
      console.error('Turnstile verification error:', error);
      return {
        success: false,
        error_codes: ['internal-error']
      };
    }
  }

  async verifyRequest(request: Request): Promise<TurnstileVerificationResult> {
    try {
      const formData = await request.formData();
      const token = formData.get('cf-turnstile-response') as string;
      
      if (!token) {
        return {
          success: false,
          error_codes: ['missing-input-response']
        };
      }

      const clientIP = request.headers.get('CF-Connecting-IP') || 
                      request.headers.get('X-Forwarded-For') || 
                      'unknown';

      return this.verifyToken(token, clientIP);
    } catch (error) {
      console.error('Turnstile request verification error:', error);
      return {
        success: false,
        error_codes: ['invalid-input-response']
      };
    }
  }
}

export const turnstile = new TurnstileService();

// Middleware helper
export async function requireTurnstileVerification(request: Request): Promise<boolean> {
  const result = await turnstile.verifyRequest(request);
  return result.success;
}
