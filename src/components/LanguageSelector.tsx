'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { LOCALES } from '@/i18n/locales'

export default function LanguageSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()

  const handleChange = (nextLocale: string) => {
    // Replace current locale in pathname with new locale
    const segments = pathname.split('/')
    segments[1] = nextLocale // Replace locale segment
    const newPath = segments.join('/')
    router.replace(newPath)
  }

  return (
    <div className="relative">
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        aria-label="Select language"
      >
        {LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {loc.toUpperCase()}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}