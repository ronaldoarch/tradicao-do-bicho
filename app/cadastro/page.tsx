'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BottomNav from '@/components/BottomNav'

export default function CadastroPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Função para formatar CPF (000.000.000-00)
  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 11) {
      return cleaned
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    return cleaned.slice(0, 14)
  }

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value)
    setCpf(formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, cpf, telefone, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar')
      }
      // Rastreamento é feito no servidor (API register) - garante envio mesmo com redirect
      router.push('/minhas-apostas')
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-scale-100">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Cadastro</h1>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">CPF</label>
              <input
                type="text"
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                maxLength={14}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Telefone</label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue focus:outline-none"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-scale-70 disabled:opacity-70"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>
          <p className="mt-4 text-sm text-gray-600">
            Já tem conta?{' '}
            <a href="/login" className="font-semibold text-blue hover:underline">
              Entrar
            </a>
          </p>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
