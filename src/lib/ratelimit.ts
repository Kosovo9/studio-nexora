// Rate limiting implementation
const rateLimitMap = new Map<string, number[]>();

export const rateLimit = {
  async check(
    ip: string,
    action: string,
    options: {
      max: number;
      window: number;
      burst?: number;
    }
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = now - options.window;
    const key = `${ip}:${action}`;

    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, []);
    }

    const requests = rateLimitMap.get(key)!;
    const validRequests = requests.filter((timestamp) => timestamp > windowStart);

    // Check burst protection
    if (options.burst) {
      const recentRequests = validRequests.filter((timestamp) => timestamp > now - 60000); // Last minute
      if (recentRequests.length >= options.burst) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: Math.max(...recentRequests) + 60000,
        };
      }
    }

    const allowed = validRequests.length < options.max;

    if (allowed) {
      validRequests.push(now);
      rateLimitMap.set(key, validRequests);
    }

    return {
      allowed,
      remaining: Math.max(0, options.max - validRequests.length - (allowed ? 1 : 0)),
      resetTime: windowStart + options.window,
    };
  },
  reset: async (ip: string, action: string): Promise<boolean> => {
    const key = `${ip}:${action}`;
    rateLimitMap.delete(key);
    return true;
  },
};