'use client'

import React, { useState } from 'react'
import { Upload, Sparkles, Star, Globe, Camera, Palette, LogIn, UserPlus, LogOut, Users, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface StudioNexoraClientProps {
  translations: {
    title: string
    subtitle: string
    uploadText: string
    basicPlan: string
    proPlan: string
    vipPlan: string
    choosePlan: string
    buildStatus: string
    currentLocale: string
    heroTitle: string
    heroSubtitle: string
    heroCta: string
    loginText: string
    signupText: string
    logoutText: string
  }
  locale: string
}

export default function StudioNexoraClient({ translations, locale }: StudioNexoraClientProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'solo' | 'pet'>('solo')
  const [isLoading, setIsLoading] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      toast.success(`Archivo seleccionado: ${file.name}`)
    }
  }

  const handleProcessImage = async () => {
    if (!selectedFile) return
    
    setIsProcessing(true)
    toast.loading('Procesando imagen...')
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsProcessing(false)
    toast.success('¡Imagen procesada exitosamente!')
  }

  const handleLogin = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoggedIn(true)
      setIsLoading(false)
      toast.success(`${translations.loginText} exitoso`)
    }, 1000)
  }

  const handleSignup = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoggedIn(true)
      setIsLoading(false)
      toast.success('Cuenta creada exitosamente')
    }, 1000)
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    toast.success('Sesión cerrada')
  }

  const handleChoosePlan = (plan: string) => {
    toast.info(`Plan ${plan} seleccionado`)
  }

  const handleCreateStudioPhoto = () => {
    if (!selectedFile) {
      toast.error('Primero selecciona una imagen')
      return
    }
    toast.success('Iniciando creación de foto de estudio...')
  }

  return (
    <div className="min-h-screen relative">
      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Build Status & Locale */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <Badge className="bg-green-500 text-white px-3 py-1">
              ✅ {translations.buildStatus}
            </Badge>
            <Badge className="bg-blue-500 text-white px-3 py-1">
              🌍 {translations.currentLocale}
            </Badge>
          </div>
          
          {/* Auth Buttons */}
          <div className="flex items-center space-x-2">
            {!isLoggedIn ? (
              <>
                <Button 
                  onClick={handleLogin} 
                  disabled={isLoading}
                  variant="outline" 
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
                  {translations.loginText}
                </Button>
                <Button 
                  onClick={handleSignup} 
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  {translations.signupText}
                </Button>
              </>
            ) : (
              <Button 
                onClick={handleLogout} 
                variant="outline" 
                className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {translations.logoutText}
              </Button>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Sparkles className="h-8 w-8 text-purple-400 mr-3" />
            <h1 className="text-4xl md:text-6xl font-bold text-white">
              {translations.title}
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            {translations.heroSubtitle}
          </p>
          
          {/* Photo Type Tabs */}
          <div className="flex justify-center mt-8 mb-8">
            <div className="bg-slate-800/50 rounded-lg p-1 flex">
              <button
                onClick={() => setSelectedTab('solo')}
                className={`px-6 py-3 rounded-md flex items-center space-x-2 transition-all ${
                  selectedTab === 'solo' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <User className="h-4 w-4" />
                <span>Solo Yo</span>
              </button>
              <button
                onClick={() => setSelectedTab('pet')}
                className={`px-6 py-3 rounded-md flex items-center space-x-2 transition-all ${
                  selectedTab === 'pet' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Yo + Mi Mascota</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Upload Section */}
          <div className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="border-2 border-dashed border-slate-600 rounded-lg p-12 mb-6 hover:border-purple-400 transition-colors">
                    <Upload className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {translations.uploadText}
                    </h3>
                    <p className="text-gray-400 mb-4">JPEG, PNG o WebP (Max 10MB)</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer transition-colors"
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      Seleccionar Imagen
                    </label>
                  </div>

                  {selectedFile && (
                    <div className="text-left">
                      <p className="text-sm text-gray-400 mb-4">
                        Archivo seleccionado: {selectedFile.name}
                      </p>
                      <Button
                        onClick={handleCreateStudioPhoto}
                        disabled={isProcessing || !selectedFile}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <Palette className="h-4 w-4 mr-2" />
                            Crear Foto de Estudio
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Plans */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              Planes de Pago
            </h2>

            {/* Basic Plan */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">{translations.basicPlan}</h3>
                  <span className="text-2xl font-bold text-blue-400">$5</span>
                </div>
                <p className="text-gray-400 mb-4">1 uso • 3 fondos</p>
                <Button 
                  onClick={() => handleChoosePlan(translations.basicPlan)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {translations.choosePlan}
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="bg-slate-800/50 border-slate-700 relative">
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-pink-500">
                POPULAR
              </Badge>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">{translations.proPlan}</h3>
                  <span className="text-2xl font-bold text-pink-400">$15</span>
                </div>
                <p className="text-gray-400 mb-4">Ilimitado • edición de ropa • mini clips</p>
                <Button 
                  onClick={() => handleChoosePlan(translations.proPlan)}
                  className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                >
                  {translations.choosePlan}
                </Button>
              </CardContent>
            </Card>

            {/* VIP Plan */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">{translations.vipPlan}</h3>
                  <span className="text-2xl font-bold text-orange-400">$30</span>
                </div>
                <p className="text-gray-400 mb-4">Prioridad • descarga al 8K • ahorros • marketplace</p>
                <Button 
                  onClick={() => handleChoosePlan(translations.vipPlan)}
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                >
                  {translations.choosePlan}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}