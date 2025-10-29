'use client'

import React, { useState } from 'react'
import { Upload, Sparkles, Star, Globe, Camera, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface StudioNexoraClientProps {
  translations: {
    title: string
    subtitle: string
    uploadText: string
    basicPlan: string
    proPlan: string
    vipPlan: string
    choosePlan: string
  }
}

export default function StudioNexoraClient({ translations }: StudioNexoraClientProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleProcessImage = async () => {
    if (!selectedFile) return
    
    setIsProcessing(true)
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsProcessing(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Sparkles className="h-8 w-8 text-purple-400 mr-3" />
            <h1 className="text-4xl md:text-6xl font-bold text-white">
              {translations.title}
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            {translations.subtitle}
          </p>
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
                        onClick={handleProcessImage}
                        disabled={isProcessing}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        {isProcessing ? (
                          <>
                            <Sparkles className="h-4 w-4 mr-2 animate-spin" />
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
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
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
                <Button className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700">
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
                <Button className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700">
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