'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function EditPromocaoPage() {
  const router = useRouter()
  const params = useParams()
  const id = parseInt(params.id as string)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tipo: 'dobro_primeiro_deposito',
    bonus: '',
    percentual: 100,
    valorMinimo: 0,
    valorMaximo: 0,
    active: true,
    order: 1,
  })

  useEffect(() => {
    loadPromocao()
  }, [id])

  const loadPromocao = async () => {
    try {
      const response = await fetch('/api/admin/promocoes')
      const data = await response.json()
      const promocao = data.promocoes.find((p: any) => p.id === id)
      if (promocao) {
        setFormData({
          title: promocao.title || '',
          description: promocao.description || '',
          tipo: promocao.tipo || 'dobro_primeiro_deposito',
          bonus: promocao.bonus || '',
          percentual: promocao.percentual || 100,
          valorMinimo: promocao.valorMinimo || 0,
          valorMaximo: promocao.valorMaximo || 0,
          active: promocao.active !== undefined ? promocao.active : true,
          order: promocao.order || 1,
        })
      }
    } catch (error) {
      console.error('Erro ao carregar promoção:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/admin/promocoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...formData }),
      })

      if (response.ok) {
        router.push('/admin/promocoes')
      } else {
        alert('Erro ao atualizar promoção')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao atualizar promoção')
    } finally {
      setSaving(false)
    }
  }

  const tiposPromocao = [
    { value: 'dobro_primeiro_deposito', label: 'Dobro do Primeiro Depósito', description: 'Usuário ganha o dobro do valor depositado (ex: deposita R$ 100, ganha R$ 200)' },
    { value: 'percentual', label: 'Percentual do Depósito', description: 'Usuário ganha uma porcentagem do valor depositado (ex: 50% de R$ 100 = R$ 50)' },
    { value: 'valor_fixo', label: 'Valor Fixo', description: 'Usuário ganha um valor fixo independente do depósito' },
    { value: 'cashback', label: 'Cashback', description: 'Usuário recebe parte do valor de volta' },
  ]

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Editar Promoção</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6">
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            rows={4}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Promoção</label>
          <select
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            required
          >
            {tiposPromocao.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {tiposPromocao.find((t) => t.value === formData.tipo)?.description}
          </p>
        </div>

        {formData.tipo === 'dobro_primeiro_deposito' && (
          <div className="bg-blue/10 border-2 border-blue rounded-lg p-4">
            <p className="text-sm font-semibold text-blue mb-2">Configuração: Dobro do Primeiro Depósito</p>
            <p className="text-xs text-gray-600 mb-4">
              ⚠️ <strong>Importante:</strong> Esta promoção se aplica APENAS no primeiro depósito do usuário.
              O usuário ganhará exatamente o dobro do valor depositado.
              Exemplo: Depósito de R$ 100 = Bônus de R$ 200 (total R$ 300 na conta).
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor Mínimo do Depósito (R$)</label>
                <input
                  type="number"
                  value={formData.valorMinimo}
                  onChange={(e) => setFormData({ ...formData, valorMinimo: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor Máximo do Depósito (R$)</label>
                <input
                  type="number"
                  value={formData.valorMaximo}
                  onChange={(e) => setFormData({ ...formData, valorMaximo: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="0"
                  step="0.01"
                  placeholder="0.00 (0 = sem limite)"
                />
              </div>
            </div>
          </div>
        )}

        {formData.tipo === 'percentual' && (
          <div className="bg-blue/10 border-2 border-blue rounded-lg p-4">
            <p className="text-sm font-semibold text-blue mb-2">Configuração: Percentual do Depósito</p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Percentual (%)</label>
              <input
                type="number"
                value={formData.percentual}
                onChange={(e) => setFormData({ ...formData, percentual: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                min="0"
                max="1000"
                step="0.01"
                placeholder="50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Exemplo: 50% de R$ 100 = Bônus de R$ 50
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor Mínimo (R$)</label>
                <input
                  type="number"
                  value={formData.valorMinimo}
                  onChange={(e) => setFormData({ ...formData, valorMinimo: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor Máximo (R$)</label>
                <input
                  type="number"
                  value={formData.valorMaximo}
                  onChange={(e) => setFormData({ ...formData, valorMaximo: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="0"
                  step="0.01"
                  placeholder="0.00 (0 = sem limite)"
                />
              </div>
            </div>
          </div>
        )}

        {formData.tipo === 'valor_fixo' && (
          <div className="bg-blue/10 border-2 border-blue rounded-lg p-4">
            <p className="text-sm font-semibold text-blue mb-2">Configuração: Valor Fixo</p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor do Bônus (R$)</label>
              <input
                type="number"
                value={formData.bonus}
                onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                min="0"
                step="0.01"
                placeholder="100.00"
                required
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor Mínimo do Depósito (R$)</label>
              <input
                type="number"
                value={formData.valorMinimo}
                onChange={(e) => setFormData({ ...formData, valorMinimo: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                min="0"
                step="0.01"
                placeholder="10.00"
              />
            </div>
          </div>
        )}

        {formData.tipo === 'cashback' && (
          <div className="bg-blue/10 border-2 border-blue rounded-lg p-4">
            <p className="text-sm font-semibold text-blue mb-2">Configuração: Cashback</p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Percentual de Cashback (%)</label>
              <input
                type="number"
                value={formData.percentual}
                onChange={(e) => setFormData({ ...formData, percentual: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                min="0"
                max="100"
                step="0.01"
                placeholder="10"
              />
              <p className="text-xs text-gray-500 mt-1">
                Exemplo: 10% de cashback em depósito de R$ 100 = R$ 10 de volta
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ordem de Exibição</label>
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
            Promoção ativa
          </label>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Promoção'}
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
