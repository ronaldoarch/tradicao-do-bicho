/**
 * Horários de Envio de Relatório de Descarga
 * 
 * Mapeia os horários de ENVIO do relatório de descarga para cada extração.
 * Padrão: 15 minutos antes do closeTime (horário oficial de fechamento)
 * 
 * IMPORTANTE: Apenas extrações que existem no sistema estão mapeadas aqui.
 */

export interface HorarioEnvioDescarga {
  loteria: string // Nome da loteria (ex: "NACIONAL", "LOOK", "PT RIO")
  horarioExtracao: string // Horário da extração (ex: "02:00", "07:20")
  horarioEnvio: string // Horário de ENVIO do relatório (15 minutos antes do closeTime)
}

/**
 * Mapeamento de horários de envio de relatório de descarga
 * 
 * Todos os horários são calculados como 15 minutos antes do closeTime
 */
export const HORARIOS_ENVIO_DESCARGA: HorarioEnvioDescarga[] = [
  // NACIONAL - 15 minutos antes do closeTime
  { loteria: 'NACIONAL', horarioExtracao: '02:00', horarioEnvio: '01:45' },
  { loteria: 'NACIONAL', horarioExtracao: '08:00', horarioEnvio: '07:45' },
  { loteria: 'NACIONAL', horarioExtracao: '10:00', horarioEnvio: '09:45' },
  { loteria: 'NACIONAL', horarioExtracao: '12:00', horarioEnvio: '11:45' },
  { loteria: 'NACIONAL', horarioExtracao: '15:00', horarioEnvio: '14:45' },
  { loteria: 'NACIONAL', horarioExtracao: '17:00', horarioEnvio: '16:45' },
  { loteria: 'NACIONAL', horarioExtracao: '21:00', horarioEnvio: '20:45' },
  { loteria: 'NACIONAL', horarioExtracao: '23:00', horarioEnvio: '22:45' },
  
  // LOOK (GO) - 15 minutos antes do closeTime
  { loteria: 'LOOK', horarioExtracao: '07:20', horarioEnvio: '07:05' },
  { loteria: 'LOOK', horarioExtracao: '09:20', horarioEnvio: '09:05' },
  { loteria: 'LOOK', horarioExtracao: '11:20', horarioEnvio: '11:05' },
  { loteria: 'LOOK', horarioExtracao: '14:20', horarioEnvio: '14:05' },
  { loteria: 'LOOK', horarioExtracao: '16:20', horarioEnvio: '16:05' },
  { loteria: 'LOOK', horarioExtracao: '18:20', horarioEnvio: '18:05' },
  { loteria: 'LOOK', horarioExtracao: '21:20', horarioEnvio: '21:05' },
  { loteria: 'LOOK', horarioExtracao: '23:20', horarioEnvio: '23:05' },
  
  // PT RIO - 10 minutos antes do closeTime (09:30, 11:30, etc.)
  { loteria: 'PT RIO', horarioExtracao: '09:30', horarioEnvio: '09:20' },
  { loteria: 'PT RIO', horarioExtracao: '11:30', horarioEnvio: '11:20' },
  { loteria: 'PT RIO', horarioExtracao: '14:30', horarioEnvio: '14:20' },
  { loteria: 'PT RIO', horarioExtracao: '16:30', horarioEnvio: '16:20' },
  { loteria: 'PT RIO', horarioExtracao: '18:30', horarioEnvio: '18:20' },
  { loteria: 'PT RIO', horarioExtracao: '21:30', horarioEnvio: '21:20' },
  
  // PT SP - 15 minutos antes do closeTime
  { loteria: 'PT SP', horarioExtracao: '10:00', horarioEnvio: '09:45' },
  { loteria: 'PT SP', horarioExtracao: '13:15', horarioEnvio: '13:00' },
  { loteria: 'PT SP', horarioExtracao: '15:15', horarioEnvio: '15:00' },
  { loteria: 'PT SP', horarioExtracao: '17:15', horarioEnvio: '17:00' },
  { loteria: 'PT SP', horarioExtracao: '20:15', horarioEnvio: '20:00' },
  
  // PT SP (Band) - 15 minutos antes do closeTime
  { loteria: 'PT SP (Band)', horarioExtracao: '15:15', horarioEnvio: '15:00' },
  
  // PT BAHIA - 15 minutos antes do closeTime
  { loteria: 'PT BAHIA', horarioExtracao: '10:20', horarioEnvio: '10:05' },
  { loteria: 'PT BAHIA', horarioExtracao: '12:20', horarioEnvio: '12:05' },
  { loteria: 'PT BAHIA', horarioExtracao: '15:20', horarioEnvio: '15:05' },
  { loteria: 'PT BAHIA', horarioExtracao: '19:00', horarioEnvio: '18:45' },
  { loteria: 'PT BAHIA', horarioExtracao: '21:20', horarioEnvio: '21:05' },
  
  // LOTEP - 15 minutos antes do closeTime
  { loteria: 'LOTEP', horarioExtracao: '10:45', horarioEnvio: '10:30' },
  { loteria: 'LOTEP', horarioExtracao: '12:45', horarioEnvio: '12:30' },
  { loteria: 'LOTEP', horarioExtracao: '15:45', horarioEnvio: '15:30' },
  { loteria: 'LOTEP', horarioExtracao: '18:05', horarioEnvio: '17:50' },
  
  // LOTECE - 15 minutos antes do closeTime
  { loteria: 'LOTECE', horarioExtracao: '11:00', horarioEnvio: '10:45' },
  { loteria: 'LOTECE', horarioExtracao: '14:00', horarioEnvio: '13:45' },
  { loteria: 'LOTECE', horarioExtracao: '15:40', horarioEnvio: '15:25' },
  { loteria: 'LOTECE', horarioExtracao: '19:40', horarioEnvio: '19:25' },
  
  // PARA TODOS - 15 minutos antes do closeTime
  { loteria: 'PARA TODOS', horarioExtracao: '09:45', horarioEnvio: '09:30' },
  { loteria: 'PARA TODOS', horarioExtracao: '20:40', horarioEnvio: '20:25' },
  
  // FEDERAL - 15 minutos antes do closeTime
  { loteria: 'FEDERAL', horarioExtracao: '20:00', horarioEnvio: '19:45' },
]

/**
 * Busca horário de envio para uma extração específica
 */
export function getHorarioEnvioDescarga(
  loteria: string,
  horarioExtracao: string
): string | null {
  const horario = HORARIOS_ENVIO_DESCARGA.find(
    (h) =>
      h.loteria.toLowerCase() === loteria.toLowerCase() &&
      h.horarioExtracao === horarioExtracao
  )
  
  return horario ? horario.horarioEnvio : null
}

/**
 * Verifica se está no horário de envio do relatório de descarga
 * 
 * @param loteria Nome da loteria
 * @param horarioExtracao Horário da extração
 * @param margemAntes Minutos ANTES do horário para permitir execução (padrão: 1 minuto)
 * @param margemDepois Minutos DEPOIS do horário para permitir execução (padrão: 2 minutos)
 */
export function estaNoHorarioEnvio(
  loteria: string,
  horarioExtracao: string,
  margemAntes: number = 1, // Permite executar 1 minuto antes
  margemDepois: number = 2 // Permite executar até 2 minutos depois
): boolean {
  const horarioEnvio = getHorarioEnvioDescarga(loteria, horarioExtracao)
  
  if (!horarioEnvio) return false
  
  const agora = new Date()
  const [horaEnvio, minutoEnvio] = horarioEnvio.split(':').map(Number)
  
  const dataEnvio = new Date()
  dataEnvio.setHours(horaEnvio, minutoEnvio, 0, 0)
  
  // Se já passou o horário hoje, considerar amanhã
  if (dataEnvio < agora) {
    dataEnvio.setDate(dataEnvio.getDate() + 1)
  }
  
  const diferencaMinutos =
    (dataEnvio.getTime() - agora.getTime()) / (1000 * 60)
  
  // Está no horário se a diferença está dentro da margem
  // Exemplo: se horário é 01:45, permite executar entre 01:44 e 01:47
  return diferencaMinutos >= -margemAntes && diferencaMinutos <= margemDepois
}
