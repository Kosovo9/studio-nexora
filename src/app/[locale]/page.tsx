import React from 'react'
import { getTranslations } from 'next-intl/server'
import StudioNexoraClient from './StudioNexoraClient'

interface PageProps {
  params: { locale: string }
}

export default async function StudioNexora({ params }: PageProps) {
  const t = await getTranslations()

  const translations = {
    title: '✨ Studio Nexora ⭐',
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
    loginText: t('navigation.login'),
    signupText: t('navigation.signup'),
    logoutText: t('navigation.logout')
  }

  return <StudioNexoraClient translations={translations} locale={params.locale} />
}