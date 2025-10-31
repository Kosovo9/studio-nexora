import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/pages/**/*.{ts,tsx,mdx}',
    './src/components/**/*.{ts,tsx,mdx}',
    './src/app/**/*.{ts,tsx,mdx}',
  ],
  theme: { extend: {} },
  plugins: [],
} satisfies Config
