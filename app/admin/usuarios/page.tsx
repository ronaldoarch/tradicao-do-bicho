'use client'

import { useEffect, useState } from 'react'
import AddSaldoModal from '@/components/AddSaldoModal'

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

  const handleAddSaldo = (usuario: Usuario) => {
    setSelectedUsuario(usuario)
    setShowAddSaldoModal(true)
  }

  const handleSaldoAdded = () => {
    loadUsuarios()
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
                      onClick={() => handleAddSaldo(usuario)}
                      className="text-green-600 hover:text-green-800 mr-4 font-semibold"
                    >
                      💰 Adicionar Saldo
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

      <AddSaldoModal
        isOpen={showAddSaldoModal}
        usuario={selectedUsuario}
        onClose={() => {
          setShowAddSaldoModal(false)
          setSelectedUsuario(null)
        }}
        onSuccess={handleSaldoAdded}
      />
    </div>
  )
}
