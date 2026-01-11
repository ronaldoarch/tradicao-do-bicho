'use client'

import { useEffect, useState } from 'react'
import { ANIMALS } from '@/data/animals'

interface Extracao {
  id: number
  name: string
  active: boolean
  time: string
  quotations?: Record<number, number>
}

export default function ExtracoesPage() {
  const [extracoes, setExtracoes] = useState<Extracao[]>([])
  const [loading, setLoading] = useState(true)
  const [editingExtracao, setEditingExtracao] = useState<number | null>(null)
  const [editedQuotations, setEditedQuotations] = useState<Record<number, number>>({})

  useEffect(() => {
    loadExtracoes()
  }, [])

  const loadExtracoes = async () => {
    try {
      const response = await fetch('/api/admin/extracoes')
      const data = await response.json()
      setExtracoes(data.extracoes || [])
    } catch (error) {
      console.error('Erro ao carregar extrações:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: number, active: boolean) => {
    try {
      await fetch('/api/admin/extracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !active }),
      })
      loadExtracoes()
    } catch (error) {
      console.error('Erro ao atualizar extração:', error)
    }
  }

  const startEditing = (extracao: Extracao) => {
    setEditingExtracao(extracao.id)
    setEditedQuotations(extracao.quotations || {})
  }

  const cancelEditing = () => {
    setEditingExtracao(null)
    setEditedQuotations({})
  }

  const saveQuotations = async (extracaoId: number) => {
    try {
      await fetch('/api/admin/extracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: extracaoId, quotations: editedQuotations }),
      })
      setEditingExtracao(null)
      setEditedQuotations({})
      loadExtracoes()
      alert('Cotações atualizadas com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar cotações:', error)
      alert('Erro ao salvar cotações')
    }
  }

  const updateQuotation = (groupId: number, value: number) => {
    setEditedQuotations({ ...editedQuotations, [groupId]: value })
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Gerenciar Extrações e Cotações</h1>

      <div className="space-y-6">
        {extracoes.map((extracao) => (
          <div key={extracao.id} className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{extracao.name}</h2>
                  <p className="text-sm text-gray-600">Horário: {extracao.time}</p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleActive(extracao.id, extracao.active)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      extracao.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {extracao.active ? 'Ativa' : 'Inativa'}
                  </button>
                  {editingExtracao !== extracao.id ? (
                    <button
                      onClick={() => startEditing(extracao)}
                      className="bg-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Editar Cotações
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveQuotations(extracao.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {editingExtracao === extracao.id ? (
              <div className="p-6 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Editar Cotações (Valor pago por R$ 1,00 apostado)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto">
                  {ANIMALS.map((animal) => {
                    const groupId = animal.group
                    const currentValue = editedQuotations[groupId] !== undefined 
                      ? editedQuotations[groupId] 
                      : (extracao.quotations?.[groupId] || 18)
                    return (
                      <div key={animal.id} className="bg-white border-2 border-blue rounded-lg p-4 shadow-sm">
                        <div className="mb-3">
                          <p className="font-bold text-gray-900">Grupo {groupId}</p>
                          <p className="text-sm text-gray-600">{animal.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-700">1:</label>
                          <input
                            type="number"
                            value={currentValue}
                            onChange={(e) => updateQuotation(groupId, parseFloat(e.target.value) || 0)}
                            className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-blue transition-colors"
                            min="0"
                            step="0.01"
                            placeholder="18.00"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          R$ 1,00 → R$ {currentValue.toFixed(2)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cotações Atuais</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {ANIMALS.map((animal) => {
                    const groupId = animal.group
                    const quotation = extracao.quotations?.[groupId] || 18
                    return (
                      <div key={animal.id} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200 hover:border-blue transition-colors">
                        <p className="text-xs text-gray-600 font-medium">Grupo {groupId}</p>
                        <p className="text-sm font-semibold text-gray-900 mb-1">{animal.name}</p>
                        <p className="text-lg font-bold text-blue">1:{quotation}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
