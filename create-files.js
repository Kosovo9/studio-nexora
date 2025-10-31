const fs = require('fs');
const path = require('path');

const localeDir = path.join(process.cwd(), 'src', 'app', '[locale]');

// Crear page.tsx
const pageContent = \import React from 'react'
import { getTranslations } from 'next-intl/server'
import StudioNexoraClient from './StudioNexoraClient'

interface PageProps {
  params: { locale: string }
}

export default async function StudioNexora({ params }: PageProps) {
  const t = await getTranslations()

  const translations = {
    title: t('hero.title'),
    subtitle: t('hero.subtitle'),
    uploadText: t('upload.title'),
    basicPlan: t('pricing.basic.name'),
    proPlan: t('pricing.pro.name'),
    vipPlan: t('pricing.vip.name'),
    choosePlan: t('pricing.choosePlan'),
    buildStatus: 'BUILD OK',
    currentLocale: params.locale.toUpperCase(),
    heroTitle: t('hero.title'),
    heroSubtitle: t('hero.subtitle'),
    heroCta: t('hero.cta'),
    heroCtaSecondary: t('hero.ctaSecondary'),
    heroBadge: t('hero.badge'),
    heroTitleAccent: t('hero.titleAccent'),
    loginText: t('navigation.login'),
    signupText: t('navigation.signup'),
    logoutText: t('navigation.logout'),
    navHome: t('navigation.home'),
    navServices: t('navigation.services'),
    navPlans: t('navigation.plans'),
    navAccess: t('navigation.access')
  }

  return <StudioNexoraClient translations={translations} locale={params.locale} />
}
\;

fs.writeFileSync(path.join(localeDir, 'page.tsx'), pageContent);
console.log('page.tsx created successfully');
