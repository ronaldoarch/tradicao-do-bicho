import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { createSessionToken, hashPassword, cleanCPF, isValidCPFFormat } from '@/lib/auth'
import { buscarPromotorPorCodigo } from '@/lib/promotor-helpers'
import { trackFacebookEventServer } from '@/lib/facebook-tracking'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nome, email, password, telefone, cpf, ref: refBody } = body || {}

    // Ref pode vir do body ou do cookie (definido quando usuário acessou com ?ref=)
    const refCookie = (await cookies()).get('lotbicho_ref')?.value
    const refCodigo = refBody || refCookie

    if (!nome || !email || !password) {
      return NextResponse.json({ error: 'Nome, email e senha são obrigatórios' }, { status: 400 })
    }

    // CPF é obrigatório
    if (!cpf) {
      return NextResponse.json(
        { error: 'CPF é obrigatório' },
        { status: 400 }
      )
    }

    // Validar formato do CPF
    if (!isValidCPFFormat(cpf)) {
      return NextResponse.json(
        { error: 'CPF inválido. Digite um CPF válido com 11 dígitos.' },
        { status: 400 }
      )
    }

    const cpfLimpo = cleanCPF(cpf)

    // Verificar se email já existe
    const existingEmail = await prisma.usuario.findUnique({ 
      where: { email } 
    })
    if (existingEmail) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }

    // Verificar se CPF já existe (uma conta por CPF)
    const existingCPF = await prisma.usuario.findUnique({ 
      where: { cpf: cpfLimpo } 
    })
    if (existingCPF) {
      return NextResponse.json(
        { error: 'CPF já cadastrado. Apenas uma conta por CPF é permitida.' },
        { status: 409 }
      )
    }

    const passwordHash = hashPassword(password)

    let promotorId: number | null = null
    if (refCodigo) {
      try {
        const promotor = await buscarPromotorPorCodigo(refCodigo)
        if (promotor) promotorId = promotor.id
      } catch (promError) {
        console.warn('Promotor ref ignorado (tabelas podem não existir ainda):', promError)
      }
    }

    const user = await prisma.usuario.create({
      data: {
        nome,
        email,
        cpf: cpfLimpo,
        telefone: telefone || null,
        passwordHash,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        saldo: true,
        bonus: true,
        bonusBloqueado: true,
        bonusSemanal: true,
      },
    })

    // Criar indicação se veio de promotor
    if (promotorId && promotorId !== user.id) {
      try {
        await prisma.indicacao.create({
          data: {
            promotorId,
            indicadoId: user.id,
          },
        })
      } catch (indError) {
        console.error('Erro ao criar indicação:', indError)
      }
    }

    // Rastrear cadastro no Facebook Pixel (CompleteRegistration) - servidor garante envio
    try {
      await trackFacebookEventServer('CompleteRegistration', {
        content_name: 'Cadastro',
      }, user.id)
    } catch (trackError) {
      console.error('Erro ao rastrear cadastro no Facebook:', trackError)
    }

    const token = createSessionToken({ id: user.id, email: user.email, nome: user.nome })
    const res = NextResponse.json({ user, message: 'Cadastro realizado com sucesso' })
    res.cookies.set('lotbicho_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    })
    if (promotorId) {
      res.cookies.set('lotbicho_ref', '', { maxAge: 0, path: '/' })
    }
    return res
  } catch (error) {
    console.error('Erro ao cadastrar:', error)
    return NextResponse.json({ error: 'Erro ao cadastrar' }, { status: 500 })
  }
}
