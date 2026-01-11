'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'

export default function EditBannerPage() {
  const router = useRouter()
  const params = useParams()
  const id = parseInt(params.id as string)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [formData, setFormData] = useState({
    badge: '',
    title: '',
    highlight: '',
    button: '',
    bonus: '',
    bonusBgClass: 'bg-green-600',
    bannerImage: '',
    logoImage: '',
    active: true,
    order: 1,
  })

  useEffect(() => {
    loadBanner()
  }, [id])

  const loadBanner = async () => {
    try {
      const response = await fetch('/api/admin/banners')
      const data = await response.json()
      const banner = data.banners.find((b: any) => b.id === id)
      if (banner) {
        setFormData({
          badge: banner.badge || '',
          title: banner.title || '',
          highlight: banner.highlight || '',
          button: banner.button || '',
          bonus: banner.bonus || '',
          bonusBgClass: banner.bonusBgClass || 'bg-green-600',
          bannerImage: banner.bannerImage || '',
          logoImage: banner.logoImage || '',
          active: banner.active !== undefined ? banner.active : true,
          order: banner.order || 1,
        })
      }
    } catch (error) {
      console.error('Erro ao carregar banner:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File, type: 'banner' | 'logo') => {
    if (type === 'banner') {
      setUploadingBanner(true)
    } else {
      setUploadingLogo(true)
    }

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('type', type)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await response.json()

      if (data.success) {
        if (type === 'banner') {
          setFormData({ ...formData, bannerImage: data.url })
        } else {
          setFormData({ ...formData, logoImage: data.url })
        }
      } else {
        alert(data.error || 'Erro ao fazer upload')
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      alert('Erro ao fazer upload do arquivo')
    } finally {
      if (type === 'banner') {
        setUploadingBanner(false)
      } else {
        setUploadingLogo(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/admin/banners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...formData }),
      })

      if (response.ok) {
        router.push('/admin/banners')
      } else {
        alert('Erro ao atualizar banner')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao atualizar banner')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Editar Banner</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6">
        {/* Upload de Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
          <div className="space-y-4">
            {formData.logoImage && (
              <div className="relative w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden">
                <Image
                  src={formData.logoImage}
                  alt="Logo preview"
                  fill
                  className="object-contain"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logoImage: '' })}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            )}
            <div>
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleFileUpload(file, 'logo')
                  }
                }}
                className="hidden"
                disabled={uploadingLogo}
              />
              <label
                htmlFor="logo-upload"
                className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer ${
                  uploadingLogo ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
              >
                {uploadingLogo ? 'Enviando...' : formData.logoImage ? 'Trocar Logo' : 'Upload Logo'}
              </label>
            </div>
          </div>
        </div>

        {/* Upload de Banner */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Imagem do Banner</label>
          <div className="space-y-4">
            {formData.bannerImage && (
              <div className="relative w-full h-48 border-2 border-gray-300 rounded-lg overflow-hidden">
                <Image
                  src={formData.bannerImage}
                  alt="Banner preview"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, bannerImage: '' })}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            )}
            <div>
              <input
                type="file"
                id="banner-upload"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleFileUpload(file, 'banner')
                  }
                }}
                className="hidden"
                disabled={uploadingBanner}
              />
              <label
                htmlFor="banner-upload"
                className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer ${
                  uploadingBanner ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
              >
                {uploadingBanner ? 'Enviando...' : formData.bannerImage ? 'Trocar Banner' : 'Upload Banner'}
              </label>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Badge</label>
          <input
            type="text"
            value={formData.badge}
            onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Destaque</label>
          <input
            type="text"
            value={formData.highlight}
            onChange={(e) => setFormData({ ...formData, highlight: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Texto do Botão</label>
          <input
            type="text"
            value={formData.button}
            onChange={(e) => setFormData({ ...formData, button: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Bônus</label>
          <input
            type="text"
            value={formData.bonus}
            onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cor do Bônus</label>
          <select
            value={formData.bonusBgClass}
            onChange={(e) => setFormData({ ...formData, bonusBgClass: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
          >
            <option value="bg-green-600">Verde</option>
            <option value="bg-blue-600">Azul</option>
            <option value="bg-purple-600">Roxo</option>
            <option value="bg-red-600">Vermelho</option>
            <option value="bg-yellow-600">Amarelo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ordem</label>
          <input
            type="number"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            min="1"
            required
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="active"
            checked={formData.active}
            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            className="h-4 w-4 text-blue focus:ring-blue border-gray-300 rounded"
          />
          <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
            Banner ativo
          </label>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Banner'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
