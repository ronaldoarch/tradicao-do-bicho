'use client'

import { useEffect, useState } from 'react'

interface Usuario {
  id: number
  nome: string
  email: string
  telefone: string
  saldo: number
  active: boolean
  createdAt: string
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddSaldoModal, setShowAddSaldoModal] = useState(false)
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null)
  const [valorSaldo, setValorSaldo] = useState('')
  const [addingSaldo, setAddingSaldo] = useState(false)

  useEffect(() => {
    loadUsuarios()
  }, [])

  const loadUsuarios = async () => {
    try {
      const response = await fetch('/api/admin/usuarios')
      const data = await response.json()
      setUsuarios(data.usuarios || [])
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: number, active: boolean) => {
    try {
      await fetch('/api/admin/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !active }),
      })
      loadUsuarios()
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)
    }
  }

  const deleteUsuario = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return

    try {
      await fetch(`/api/admin/usuarios?id=${id}`, { method: 'DELETE' })
      loadUsuarios()
    } catch (error) {
      console.error('Erro ao deletar usuário:', error)
    }
  }

  const openAddSaldoModal = (usuario: Usuario) => {
    setSelectedUsuario(usuario)
    setValorSaldo('')
    setShowAddSaldoModal(true)
  }

  const handleAddSaldo = async () => {
    if (!selectedUsuario || !valorSaldo) {
      alert('Digite um valor')
      return
    }

    const valor = parseFloat(valorSaldo)
    if (isNaN(valor) || valor <= 0) {
      alert('Valor inválido')
      return
    }

    setAddingSaldo(true)
    try {
      const response = await fetch(`/api/admin/usuarios/${selectedUsuario.id}/saldo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valor,
          descricao: 'Depósito manual via admin',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Saldo adicionado com sucesso!\nNovo saldo: R$ ${data.usuario.saldoNovo.toFixed(2)}`)
        setShowAddSaldoModal(false)
        setSelectedUsuario(null)
        setValorSaldo('')
        loadUsuarios()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao adicionar saldo')
      }
    } catch (error) {
      console.error('Erro ao adicionar saldo:', error)
      alert('Erro ao adicionar saldo')
    } finally {
      setAddingSaldo(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Gerenciar Usuários</h1>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Nenhum usuário cadastrado
                </td>
              </tr>
            ) : (
              usuarios.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.nome}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.telefone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {usuario.saldo?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(usuario.id, usuario.active)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        usuario.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {usuario.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openAddSaldoModal(usuario)}
                      className="text-green-600 hover:text-green-800 mr-4"
                    >
                      + Saldo
                    </button>
                    <button
                      onClick={() => toggleActive(usuario.id, usuario.active)}
                      className="text-blue hover:text-blue-700 mr-4"
                    >
                      {usuario.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => deleteUsuario(usuario.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Adicionar Saldo */}
      {showAddSaldoModal && selectedUsuario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Adicionar Saldo</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Usuário: <strong>{selectedUsuario.nome}</strong> (ID: {selectedUsuario.id})
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Saldo atual: <strong>R$ {selectedUsuario.saldo?.toFixed(2) || '0.00'}</strong>
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor a adicionar (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={valorSaldo}
                onChange={(e) => setValorSaldo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="100.00"
                autoFocus
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowAddSaldoModal(false)
                  setSelectedUsuario(null)
                  setValorSaldo('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={addingSaldo}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddSaldo}
                disabled={addingSaldo || !valorSaldo}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingSaldo ? 'Adicionando...' : 'Adicionar Saldo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
