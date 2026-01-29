/**
 * Cliente para API de Integração FRK (Versão 5.0)
 * 
 * Documentação: API Integração (Versão 5.0) – Apenas Descarga
 * Base URL: https://frkentrypoint.com/ws.svc/
 */

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
  sdtDataJogo: string // "YYYY-MM-DD"
  sdtDataHora: string // "YYYY-MM-DD HH:mm"
  tnyExtracao: number
  sntQuantidadeApostas: number
  numValorApostas: number
  chrSerial: string
  chrCodigoPonto: string
  chrCodigoOperador: string
  sdtDataHoraTerminal: string // "YYYY-MM-DD HH:mm"
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
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Grant: this.config.grant,
          CodigoIntegrador: this.config.CodigoIntegrador,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`)
      }

      const data: FrkAuthResponse = await response.json()

      if (data.codResposta !== '000') {
        throw new Error(`Erro na autenticação: ${data.mensagem || data.codResposta}`)
      }

      // Armazenar token e calcular expiração
      this.accessToken = data.accessToken
      this.tokenExpiresAt = Date.now() + (data.expiraEm * 1000) - 60000 // 1 minuto antes de expirar

      console.log(`✅ Autenticação FRK bem-sucedida. Token expira em ${data.expiraEm}s`)

      return this.accessToken
    } catch (error) {
      console.error('❌ Erro ao autenticar na API FRK:', error)
      throw error
    }
  }

  /**
   * Efetua descarga (envia apostas)
   */
  async efetuarDescarga(request: Omit<FrkDescargaRequest, 'accessToken' | 'grant' | 'CodigoIntegrador' | 'Sistema_ID'>): Promise<FrkDescargaResponse> {
    // Garantir que está autenticado
    const accessToken = await this.authenticate()

    const url = `${this.config.baseUrl}/EfetuaDescarga`

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
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accessToken,
          CodigoIntegrador: this.config.CodigoIntegrador,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`)
      }

      const data: FrkDescargaResponse = await response.json()

      // Se token inválido, tentar reautenticar uma vez
      if (data.CodResposta === '001') {
        console.log('⚠️ Token inválido, tentando reautenticar...')
        this.accessToken = null
        this.tokenExpiresAt = 0
        return this.efetuarDescarga(request)
      }

      if (data.CodResposta !== '000') {
        throw new Error(`Erro na descarga: ${data.Mensagem || data.CodResposta} - ${data.strErrorMessage || ''}`)
      }

      console.log(`✅ Descarga efetuada com sucesso. Pule: ${data.intNumeroPule}`)

      return data
    } catch (error) {
      console.error('❌ Erro ao efetuar descarga:', error)
      throw error
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
  // Mapeamento baseado na documentação
  // Valores comuns: 1 = Grupo, 2 = Milhar, etc.
  // Ajustar conforme necessário
  const map: Record<string, number> = {
    'GRUPO': 1,
    'MILHAR': 2,
    'CENTENA': 3,
    'DEZENA': 4,
    'DUQUE_GRUPO': 5,
    'DUQUE_DEZENA': 6,
    'TERNO_GRUPO': 7,
    'TERNO_DEZENA': 8,
  }

  return map[modalidade] || 1
}

/**
 * Mapeia posição/premio interno para código FRK
 */
export function mapearPremioFRK(posicao: number): string {
  // FRK usa string "1", "2", "3", etc.
  return posicao.toString()
}
