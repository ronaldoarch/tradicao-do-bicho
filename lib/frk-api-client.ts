/**
 * Cliente para API de Integração FRK (Versão 5.0)
 * 
 * Documentação: API Integração (Versão 5.0) – Apenas Descarga
 * Base URL: https://frkentrypoint.com/ws.svc/
 */

/**
 * Converte data/hora para formato brasileiro (DD/MM/YYYY HH:mm)
 * Tenta manter o horário original sem conversão de fuso, pois a API pode fazer a conversão internamente
 */
function formatarDataHoraBrasil(dataHora: string): string {
  // Se já está no formato DD/MM/YYYY HH:mm, retornar como está
  if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(dataHora)) {
    return dataHora
  }

  // Parse da data/hora
  let ano: number, mes: number, dia: number, horas: number, minutos: number
  
  if (dataHora.includes('T')) {
    // Formato ISO: YYYY-MM-DDTHH:mm ou YYYY-MM-DDTHH:mm:ss
    const date = new Date(dataHora)
    // Usar métodos locais para manter o horário como está
    ano = date.getFullYear()
    mes = date.getMonth() + 1
    dia = date.getDate()
    horas = date.getHours()
    minutos = date.getMinutes()
  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(dataHora)) {
    // Formato YYYY-MM-DD HH:mm - usar diretamente sem conversão
    const [dataPart, horaPart] = dataHora.split(' ')
    const [a, m, d] = dataPart.split('-').map(Number)
    const [h, min] = horaPart.split(':').map(Number)
    ano = a
    mes = m
    dia = d
    horas = h
    minutos = min
  } else {
    // Tentar parse direto
    const date = new Date(dataHora)
    ano = date.getFullYear()
    mes = date.getMonth() + 1
    dia = date.getDate()
    horas = date.getHours()
    minutos = date.getMinutes()
  }
  
  // Formatar como DD/MM/YYYY HH:mm (sem conversão de fuso)
  const diaBR = String(dia).padStart(2, '0')
  const mesBR = String(mes).padStart(2, '0')
  const anoBR = ano
  const horasBR = String(horas).padStart(2, '0')
  const minutosBR = String(minutos).padStart(2, '0')
  
  return `${diaBR}/${mesBR}/${anoBR} ${horasBR}:${minutosBR}`
}

/**
 * Converte data para formato brasileiro (DD/MM/YYYY)
 */
function formatarDataBrasil(data: string): string {
  // Se já está no formato DD/MM/YYYY, retornar como está
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
    return data
  }

  // Converter formato YYYY-MM-DD para DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}/.test(data)) {
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  return data
}

export interface FrkAuthRequest {
  Sistema_ID: number // Sempre 9
  Cliente_id: number // Cliente_ID fornecido
}

export interface FrkAuthResponse {
  codResposta: string // "000" = sucesso
  mensagem: string
  accessToken: string
  expiraEm: number // segundos
}

export interface FrkDescargaRequest {
  accessToken: string
  grant: string
  CodigoIntegrador: string
  Sistema_ID: number // Sempre 9
  Cliente_ID: number // Igual ao Banca_ID
  Banca_ID: number
  sdtDataJogo: string // "YYYY-MM-DD" (formato ISO conforme documentação FRK)
  sdtDataHora: string // "YYYY-MM-DD HH:mm" (formato ISO conforme documentação FRK)
  tnyExtracao: number
  sntQuantidadeApostas: number
  numValorApostas: number
  chrSerial: string
  chrCodigoPonto: string
  chrCodigoOperador: string
  sdtDataHoraTerminal: string // "YYYY-MM-DD HH:mm" (formato ISO conforme documentação FRK)
  vchVersaoTerminal: string
  arrApostas: Array<{
    sntTipoJogo: number
    vchNumero: string
    vchPremio: string
    numValor: number
    numValorTotal: number
  }>
  arrExtracaoData: any[]
}

export interface FrkDescargaResponse {
  CodResposta: string // "000" = sucesso
  Mensagem: string
  intCodigoRetorno: number
  intNumeroPule: number
  isError: boolean
  strErrorMessage: string
}

export interface FrkExtracaoRequest {
  CodigoIntegrador: number
  Sistema_ID: number // Sempre 9
  Banca_ID: number
  strData: string // "YYYY-MM-DD"
}

export interface FrkExtracao {
  bitBolao: number
  bitConcurso: number
  bitDefesa: number
  bitDomingo: number
  bitEsconderNoMenu: number
  bitHoje: number
  bitInstantanea: number
  bitME: number
  bitQuarta: number
  bitQuinta: number
  bitSabado: number
  bitSegunda: number
  bitSexta: number
  bitTerca: number
  chrCodigoExtracaoExterno: string | null
  chrHorario: string
  chrHorarioBloqueio: string
  tnyExtracao: number
  tnySituacao: number
  vchDescricao: string
}

export interface FrkExtracaoResponse {
  CodResposta: string
  Mensagem: string
  arrExtracoes: FrkExtracao[]
  isError: boolean
  strErrorMessage: string
}

export interface FrkResultadoRequest {
  CodigoIntegrador: number
  Sistema_ID: number // Sempre 9
  Banca_ID: number
  strData: string // "YYYY-MM-DD"
  tnyExtracao: number // 0 = retorna todos
}

export interface FrkResultado {
  tnyExtracao: number
  tnyGrupo: number
  tnyPremio: number
  vchBicho: string
  vchDescricao: string
  vchNumero: string
}

export interface FrkResultadoResponse {
  CodResposta: string
  Mensagem: string
  arrResultados: FrkResultado[]
  isError: boolean
  strErrorMessage: string
}

export interface FrkConfig {
  baseUrl: string
  grant: string
  CodigoIntegrador: string
  Sistema_ID: number
  Cliente_ID: number
  Banca_ID: number
  chrSerial?: string
  chrCodigoPonto?: string
  chrCodigoOperador?: string
  vchVersaoTerminal?: string
}

export class FrkApiClient {
  private config: FrkConfig
  private accessToken: string | null = null
  private tokenExpiresAt: number = 0

  constructor(config: FrkConfig) {
    this.config = {
      ...config,
      Sistema_ID: 9, // Sempre 9
      vchVersaoTerminal: config.vchVersaoTerminal || '1.0.0',
    }
  }

  /**
   * Autentica no sistema e obtém accessToken
   */
  async authenticate(): Promise<string> {
    // Verificar se token ainda é válido
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken
    }

    const url = `${this.config.baseUrl}/Autenticacao`

    const body: FrkAuthRequest = {
      Sistema_ID: this.config.Sistema_ID,
      Cliente_id: this.config.Cliente_ID,
    }

    try {
      console.log(`🔐 Autenticando em: ${url}`)
      console.log(`📤 Headers: Grant=${this.config.grant ? '***' : 'não configurado'}, CodigoIntegrador=${this.config.CodigoIntegrador ? '***' : 'não configurado'}`)
      console.log(`📤 Body:`, body)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Grant: this.config.grant,
          CodigoIntegrador: this.config.CodigoIntegrador,
        },
        body: JSON.stringify(body),
      })

      const responseText = await response.text()
      console.log(`📥 Resposta HTTP ${response.status}:`, responseText.substring(0, 200))

      if (!response.ok) {
        let errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = JSON.parse(responseText)
          if (errorData.mensagem) errorMessage += ` - ${errorData.mensagem}`
          if (errorData.codResposta) errorMessage += ` (Código: ${errorData.codResposta})`
        } catch {
          errorMessage += ` - Resposta: ${responseText.substring(0, 100)}`
        }
        throw new Error(errorMessage)
      }

      let raw: any
      try {
        raw = JSON.parse(responseText)
      } catch (parseError) {
        throw new Error(`Resposta inválida da API: ${responseText.substring(0, 200)}`)
      }

      // Aceitar resposta em camelCase ou PascalCase (API pode variar)
      const codResposta = raw.codResposta ?? raw.CodResposta ?? raw.cod_resposta
      const mensagem = raw.mensagem ?? raw.Mensagem ?? ''
      const accessToken = raw.accessToken ?? raw.AccessToken ?? raw.access_token
      const expiraEm = raw.expiraEm ?? raw.ExpiraEm ?? raw.expira_em ?? 3600

      if (accessToken && (codResposta === '000' || codResposta === undefined)) {
        // Sucesso: tem token e código 000 ou API não retornou código
        this.accessToken = accessToken
        this.tokenExpiresAt = Date.now() + (expiraEm * 1000) - 60000
        console.log(`✅ Autenticação FRK bem-sucedida. Token expira em ${expiraEm}s`)
        return accessToken
      }

      if (codResposta && codResposta !== '000') {
        throw new Error(mensagem || `Código de resposta da API: ${codResposta}`)
      }

      if (!accessToken) {
        throw new Error(mensagem || 'Token não retornado pela API. Verifique Grant, Código Integrador e URL.')
      }

      this.accessToken = accessToken
      this.tokenExpiresAt = Date.now() + (expiraEm * 1000) - 60000
      return accessToken
    } catch (error: any) {
      console.error('❌ Erro ao autenticar na API FRK:', error)
      // Re-throw com mensagem mais clara
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`Erro desconhecido: ${String(error)}`)
    }
  }

  /**
   * Efetua descarga (envia apostas)
   */
  async efetuarDescarga(
    request: Omit<FrkDescargaRequest, 'accessToken' | 'grant' | 'CodigoIntegrador' | 'Sistema_ID' | 'Cliente_ID' | 'Banca_ID' | 'chrSerial' | 'chrCodigoPonto' | 'chrCodigoOperador' | 'vchVersaoTerminal'>,
    retryCount: number = 0
  ): Promise<FrkDescargaResponse> {
    // Limitar tentativas para evitar loop infinito
    if (retryCount > 1) {
      throw new Error('Máximo de tentativas de descarga excedido')
    }

    // Garantir que está autenticado
    const accessToken = await this.authenticate()

    const url = `${this.config.baseUrl}/EfetuaDescarga`

    // Converter para formato ISO (YYYY-MM-DD HH:mm) conforme documentação FRK
    // A documentação especifica: "sdtDataJogo": "2021-07-07", "sdtDataHora": "2021-07-07 11:44"
    let sdtDataJogo: string
    let sdtDataHora: string
    let sdtDataHoraTerminal: string

    // Converter sdtDataJogo para YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(request.sdtDataJogo)) {
      // Já está no formato ISO
      sdtDataJogo = request.sdtDataJogo
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(request.sdtDataJogo)) {
      // Converter de DD/MM/YYYY para YYYY-MM-DD
      const [dia, mes, ano] = request.sdtDataJogo.split('/')
      sdtDataJogo = `${ano}-${mes}-${dia}`
    } else {
      // Tentar parse direto
      const date = new Date(request.sdtDataJogo)
      sdtDataJogo = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    // Converter sdtDataHora para YYYY-MM-DD HH:mm
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(request.sdtDataHora)) {
      // Já está no formato ISO
      sdtDataHora = request.sdtDataHora
    } else if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(request.sdtDataHora)) {
      // Converter de DD/MM/YYYY HH:mm para YYYY-MM-DD HH:mm
      const [dataPart, horaPart] = request.sdtDataHora.split(' ')
      const [dia, mes, ano] = dataPart.split('/')
      sdtDataHora = `${ano}-${mes}-${dia} ${horaPart}`
    } else {
      // Tentar parse direto
      const date = new Date(request.sdtDataHora.replace(' ', 'T'))
      sdtDataHora = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }

    // Converter sdtDataHoraTerminal para YYYY-MM-DD HH:mm
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(request.sdtDataHoraTerminal)) {
      // Já está no formato ISO
      sdtDataHoraTerminal = request.sdtDataHoraTerminal
    } else if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(request.sdtDataHoraTerminal)) {
      // Converter de DD/MM/YYYY HH:mm para YYYY-MM-DD HH:mm
      const [dataPart, horaPart] = request.sdtDataHoraTerminal.split(' ')
      const [dia, mes, ano] = dataPart.split('/')
      sdtDataHoraTerminal = `${ano}-${mes}-${dia} ${horaPart}`
    } else {
      // Tentar parse direto
      const date = new Date(request.sdtDataHoraTerminal.replace(' ', 'T'))
      sdtDataHoraTerminal = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }

    console.log('🕐 Conversão de datas:', {
      original: {
        sdtDataJogo: request.sdtDataJogo,
        sdtDataHora: request.sdtDataHora,
        sdtDataHoraTerminal: request.sdtDataHoraTerminal,
      },
      convertido: {
        sdtDataJogo,
        sdtDataHora,
        sdtDataHoraTerminal,
      },
    })

    const body: FrkDescargaRequest = {
      accessToken,
      grant: this.config.grant,
      CodigoIntegrador: this.config.CodigoIntegrador,
      Sistema_ID: this.config.Sistema_ID,
      Cliente_ID: this.config.Cliente_ID,
      Banca_ID: this.config.Banca_ID,
      chrSerial: this.config.chrSerial || '',
      chrCodigoPonto: this.config.chrCodigoPonto || '',
      chrCodigoOperador: this.config.chrCodigoOperador || '',
      vchVersaoTerminal: this.config.vchVersaoTerminal || '1.0.0',
      ...request,
      sdtDataJogo,
      sdtDataHora,
      sdtDataHoraTerminal,
    }

    try {
      console.log('📤 Enviando descarga para FRK:', {
        url,
        body: {
          ...body,
          accessToken: accessToken.substring(0, 20) + '...',
          grant: body.grant ? '***' : undefined,
        },
      })

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accessToken,
          CodigoIntegrador: this.config.CodigoIntegrador,
        },
        body: JSON.stringify(body),
      })

      console.log(`📥 Resposta HTTP: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erro ao ler resposta')
        console.error('❌ Erro HTTP na descarga:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 500),
        })
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}. Resposta: ${errorText.substring(0, 200)}`)
      }

      const responseText = await response.text()
      console.log('📥 Resposta completa:', responseText.substring(0, 500))

      let data: FrkDescargaResponse
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('❌ Erro ao fazer parse da resposta JSON:', parseError)
        console.error('Resposta recebida:', responseText)
        throw new Error(`Resposta inválida da API FRK: ${responseText.substring(0, 200)}`)
      }

      // Normalizar campos (PascalCase ou camelCase)
      if (!data.CodResposta && (data as any).codResposta) {
        data = {
          ...data,
          CodResposta: (data as any).codResposta,
          Mensagem: (data as any).mensagem || (data as any).Mensagem,
          intCodigoRetorno: (data as any).intCodigoRetorno || (data as any).intCodigoRetorno,
          intNumeroPule: (data as any).intNumeroPule || (data as any).intNumeroPule,
          isError: (data as any).isError || false,
          strErrorMessage: (data as any).strErrorMessage || (data as any).strErrorMessage || '',
        }
      }

      console.log('📋 Dados normalizados:', data)

      // Se token inválido, tentar reautenticar uma vez
      if (data.CodResposta === '001') {
        console.log('⚠️ Token inválido, tentando reautenticar...')
        this.accessToken = null
        this.tokenExpiresAt = 0
        return this.efetuarDescarga(request, retryCount)
      }

      // Se erro de data/hora inválida, tentar extrair o horário sugerido da mensagem
      if (data.CodResposta === '013' && data.strErrorMessage?.includes('Favor ajustar para') && retryCount === 0) {
        // A API pode retornar horário em formato brasileiro (DD/MM/YYYY HH:mm) ou ISO (YYYY-MM-DD HH:mm)
        const matchBR = data.strErrorMessage.match(/(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})/)
        const matchISO = data.strErrorMessage.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/)
        const horarioSugerido = matchBR ? matchBR[1] : (matchISO ? matchISO[1] : null)
        
        if (horarioSugerido) {
          console.log(`⚠️ API sugeriu horário: ${horarioSugerido}. Tentando novamente...`)
          
          // Converter para formato ISO (YYYY-MM-DD HH:mm) conforme documentação
          let sdtDataJogoISO: string
          let sdtDataHoraISO: string
          
          if (matchBR) {
            // Converter de DD/MM/YYYY HH:mm para YYYY-MM-DD HH:mm
            const [dataPart, horaPart] = horarioSugerido.split(' ')
            const [dia, mes, ano] = dataPart.split('/')
            sdtDataJogoISO = `${ano}-${mes}-${dia}`
            sdtDataHoraISO = `${ano}-${mes}-${dia} ${horaPart}`
          } else {
            // Já está no formato ISO
            const [dataPart, horaPart] = horarioSugerido.split(' ')
            sdtDataJogoISO = dataPart
            sdtDataHoraISO = horarioSugerido
          }
          
          // Obter horário atual do servidor em formato ISO
          const agora = new Date()
          const anoTerminal = agora.getFullYear()
          const mesTerminal = String(agora.getMonth() + 1).padStart(2, '0')
          const diaTerminal = String(agora.getDate()).padStart(2, '0')
          const horasTerminal = String(agora.getHours()).padStart(2, '0')
          const minutosTerminal = String(agora.getMinutes()).padStart(2, '0')
          const horarioTerminalISO = `${anoTerminal}-${mesTerminal}-${diaTerminal} ${horasTerminal}:${minutosTerminal}`
          
          console.log(`🔄 Tentando novamente com formato ISO:`)
          console.log(`   - sdtDataJogo: ${sdtDataJogoISO}`)
          console.log(`   - sdtDataHora: ${sdtDataHoraISO} (sugerido pela API)`)
          console.log(`   - sdtDataHoraTerminal: ${horarioTerminalISO} (horário atual do terminal)`)
          
          // Usar horário sugerido para sdtDataHora, mas horário atual do terminal para sdtDataHoraTerminal
          return this.efetuarDescarga({
            ...request,
            sdtDataJogo: sdtDataJogoISO, // "2026-02-04"
            sdtDataHora: sdtDataHoraISO, // "2026-02-04 17:12" (sugerido pela API, formato ISO)
            sdtDataHoraTerminal: horarioTerminalISO, // Horário atual do terminal em formato ISO
          }, retryCount + 1)
        }
      }

      if (data.CodResposta !== '000') {
        let errorMsg = `Erro na descarga: ${data.Mensagem || data.CodResposta}`
        
        if (data.strErrorMessage) {
          errorMsg += ` - ${data.strErrorMessage}`
        }
        
        // Adicionar informações adicionais para erro 013
        if (data.CodResposta === '013') {
          errorMsg += '\n\n💡 Possíveis causas:'
          errorMsg += '\n- Extração pode não estar disponível/ativa no horário especificado'
          errorMsg += '\n- Horário do terminal pode não estar sincronizado com servidor FRK'
          errorMsg += '\n- Configuração do terminal (chrSerial, chrCodigoPonto, chrCodigoOperador) pode estar incorreta'
          errorMsg += '\n- Verifique se a extração existe e está ativa usando a API de extrações'
        }
        
        console.error('❌', errorMsg)
        console.error('📋 Detalhes da resposta:', {
          CodResposta: data.CodResposta,
          Mensagem: data.Mensagem,
          strErrorMessage: data.strErrorMessage,
          intCodigoRetorno: data.intCodigoRetorno,
        })
        
        throw new Error(errorMsg)
      }

      console.log(`✅ Descarga efetuada com sucesso. Pule: ${data.intNumeroPule}`)

      return data
    } catch (error: any) {
      console.error('❌ Erro ao efetuar descarga:', error)
      if (error.message) {
        throw error
      }
      throw new Error(`Erro ao efetuar descarga: ${error.toString()}`)
    }
  }

  /**
   * Busca extrações disponíveis
   */
  async buscarExtracoes(data: string): Promise<FrkExtracao[]> {
    const url = `${this.config.baseUrl}/Extracoes`

    const body: FrkExtracaoRequest = {
      CodigoIntegrador: parseInt(this.config.CodigoIntegrador, 10),
      Sistema_ID: this.config.Sistema_ID,
      Banca_ID: this.config.Banca_ID,
      strData: data,
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          CodigoIntegrador: this.config.CodigoIntegrador,
        },
        // Para GET, enviar body como query params ou no body dependendo da API
        // Vou tentar como query params primeiro
      })

      // Se GET não funcionar, tentar POST
      if (!response.ok) {
        const postResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            CodigoIntegrador: this.config.CodigoIntegrador,
          },
          body: JSON.stringify(body),
        })

        if (!postResponse.ok) {
          throw new Error(`Erro HTTP ${postResponse.status}: ${postResponse.statusText}`)
        }

        const data: FrkExtracaoResponse = await postResponse.json()

        if (data.CodResposta !== '000') {
          throw new Error(`Erro ao buscar extrações: ${data.Mensagem || data.CodResposta}`)
        }

        return data.arrExtracoes || []
      }

      const data: FrkExtracaoResponse = await response.json()

      if (data.CodResposta !== '000') {
        throw new Error(`Erro ao buscar extrações: ${data.Mensagem || data.CodResposta}`)
      }

      return data.arrExtracoes || []
    } catch (error) {
      console.error('❌ Erro ao buscar extrações:', error)
      throw error
    }
  }

  /**
   * Busca resultados de uma data/extração
   */
  async buscarResultados(data: string, extracao: number = 0): Promise<FrkResultado[]> {
    const url = `${this.config.baseUrl}/Resultado`

    const body: FrkResultadoRequest = {
      CodigoIntegrador: parseInt(this.config.CodigoIntegrador, 10),
      Sistema_ID: this.config.Sistema_ID,
      Banca_ID: this.config.Banca_ID,
      strData: data,
      tnyExtracao: extracao, // 0 = todos
    }

    try {
      // Tentar GET primeiro
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          CodigoIntegrador: this.config.CodigoIntegrador,
        },
      })

      // Se GET não funcionar, tentar POST
      if (!response.ok) {
        const postResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            CodigoIntegrador: this.config.CodigoIntegrador,
          },
          body: JSON.stringify(body),
        })

        if (!postResponse.ok) {
          throw new Error(`Erro HTTP ${postResponse.status}: ${postResponse.statusText}`)
        }

        const data: FrkResultadoResponse = await postResponse.json()

        if (data.CodResposta !== '000') {
          throw new Error(`Erro ao buscar resultados: ${data.Mensagem || data.CodResposta}`)
        }

        return data.arrResultados || []
      }

      const data: FrkResultadoResponse = await response.json()

      if (data.CodResposta !== '000') {
        throw new Error(`Erro ao buscar resultados: ${data.Mensagem || data.CodResposta}`)
      }

      return data.arrResultados || []
    } catch (error) {
      console.error('❌ Erro ao buscar resultados:', error)
      throw error
    }
  }
}

/**
 * Mapeia tipo de jogo interno para código FRK
 */
export function mapearTipoJogoFRK(modalidade: string, tipo: string): number {
  // Mapeamento baseado na planilha "730 - Integração Externa"
  // ID Jogo conforme planilha fornecida
  const map: Record<string, number> = {
    'MILHAR': 1,        // ID Jogo: 1, Sigla: M
    'CENTENA': 2,       // ID Jogo: 2, Sigla: C
    'DEZENA': 3,        // ID Jogo: 3, Sigla: D
    'GRUPO': 4,         // ID Jogo: 4, Sigla: G
    'TERNO_DEZENA': 5,  // ID Jogo: 5, Sigla: TD
    'TERNO_GRUPO': 6,   // ID Jogo: 6, Sigla: TG
    'DUQUE_DEZENA': 7,  // ID Jogo: 7, Sigla: DD
    'DUQUE_GRUPO': 8,   // ID Jogo: 8, Sigla: DG
    'GRUPO_COMBINADO': 49, // ID Jogo: 49, Sigla: GC
    'QUINA': 555,       // ID Jogo: 555, Sigla: Q
    'SENA': 666,        // ID Jogo: 666, Sigla: S
    'LOTINHA': 1515,    // ID Jogo: 1515, Sigla: LT
    'PASSE_SECO_VAI': 813, // ID Jogo: 813, Sigla: PV
    'PASSE_VOLTA_VAI_VEM': 83, // ID Jogo: 83, Sigla: PVV
  }

  return map[modalidade] || 1 // Default: milhar
}

/**
 * Mapeia posição/premio interno para código FRK
 */
export function mapearPremioFRK(posicao: number): string {
  // FRK usa string "1", "2", "3", etc.
  return posicao.toString()
}
