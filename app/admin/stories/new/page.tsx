'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function NewStoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    image: '',
    alt: '',
    active: true,
    order: 1,
  })

  const handleFileUpload = async (file: File) => {
    setUploadingImage(true)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('type', 'story')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await response.json()

      if (data.success) {
        setFormData({ ...formData, image: data.url })
      } else {
        alert(data.error || 'Erro ao fazer upload')
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      alert('Erro ao fazer upload do arquivo')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/admin/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.push('/admin/stories')
      } else {
        alert('Erro ao criar story')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao criar story')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Novo Story</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6">
        {/* Upload de Imagem */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Imagem do Story</label>
          <div className="space-y-4">
            {formData.image && (
              <div className="relative w-full h-64 border-2 border-gray-300 rounded-lg overflow-hidden">
                <Image
                  src={formData.image}
                  alt="Story preview"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, image: '' })}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            )}
            <div>
              <input
                type="file"
                id="story-image-upload"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleFileUpload(file)
                  }
                }}
                className="hidden"
                disabled={uploadingImage}
              />
              <label
                htmlFor="story-image-upload"
                className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer ${
                  uploadingImage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
              >
                {uploadingImage ? 'Enviando...' : formData.image ? 'Trocar Imagem' : 'Upload Imagem'}
              </label>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            required
            placeholder="Ex: Aposte com segurança!"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Texto Alternativo (Alt)</label>
          <input
            type="text"
            value={formData.alt}
            onChange={(e) => setFormData({ ...formData, alt: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            placeholder="Texto alternativo para acessibilidade"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ordem</label>
          <input
            type="number"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
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
            Story ativo
          </label>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Story'}
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
