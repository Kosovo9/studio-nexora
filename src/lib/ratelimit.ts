export const limit = async <T>(f: () => Promise<T>): Promise<T> => f()

export const rateLimit = {
  check: async () => ({ success: true, remaining: 100 }),
  reset: async () => true
}