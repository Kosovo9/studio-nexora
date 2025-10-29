import React from 'react'
import { getTranslations } from 'next-intl/server'
import StudioNexoraClient from './StudioNexoraClient'

interface PageProps {
  params: { locale: string }
}

export default async function StudioNexora({ params }: PageProps) {
  const t = await getTranslations('common')

  const translations = {
    title: '✨ Studio Nexora',
    subtitle: 'Fotografía de estudio hiperrealista con IA. Sube tu foto y elige tu estilo.',
    uploadText: 'Sube tu foto para comenzar',
    basicPlan: 'Básico',
    proPlan: 'Pro',
    vipPlan: 'VIP',
    choosePlan: 'Choose Plan'
  }

  return <StudioNexoraClient translations={translations} />
}