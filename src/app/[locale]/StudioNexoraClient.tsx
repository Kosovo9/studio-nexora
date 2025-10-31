'use client';

import { useTranslations } from 'next-intl';

export default function StudioNexoraClient() {
  const t = useTranslations('common');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          {t('welcome')}
        </h1>
        <p className="text-xl text-gray-200 text-center mb-8">
          {t('description')}
        </p>
        <div className="flex justify-center">
          <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
            {t('createPhoto')}
          </button>
        </div>
      </div>
    </div>
  );
}
