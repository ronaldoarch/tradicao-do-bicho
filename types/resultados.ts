export interface ResultadoItem {
  position: string
  milhar: string
  grupo: string
  animal: string
  drawTime?: string
  loteria?: string
  location?: string
  date?: string
  estado?: string
  posicao?: number
  colocacao?: string
  horario?: string
  horarioOriginal?: string // Horário original antes da normalização
  dataExtracao?: string
  timestamp?: string
  fonte?: string
  urlOrigem?: string
}

export interface ResultadosResponse {
  results: ResultadoItem[]
  updatedAt?: string
}
