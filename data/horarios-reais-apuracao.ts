/**
 * Horários Reais de Apuração
 * 
 * Define os horários reais de início e fechamento de apuração para cada extração/horário.
 * Esses horários são usados para validar se uma aposta pode ser criada e se pode ser liquidada.
 */

export interface HorarioRealApuracao {
  name: string // Nome da extração (ex: "PT RIO", "LOOK")
  time: string // Horário da extração (ex: "11:20", "14:20")
  startTimeReal: string // Horário real de início da apuração (ex: "11:20")
  closeTimeReal: string // Horário real de fechamento/apuração (ex: "11:20")
  diasSemSorteio?: number[] // Dias da semana sem sorteio (0=Domingo, 1=Segunda, ..., 6=Sábado)
}

/**
 * Lista de horários reais de apuração
 * 
 * Para cada extração/horário, define:
 * - startTimeReal: quando começa a apuração (geralmente igual ao time)
 * - closeTimeReal: quando fecha/apura (geralmente igual ao time ou alguns minutos depois)
 * - diasSemSorteio: dias da semana que não têm sorteio (opcional)
 */
export const HORARIOS_REAIS_APURACAO: HorarioRealApuracao[] = [
  // LOTECE
  { name: 'LOTECE', time: '11:00', startTimeReal: '11:00', closeTimeReal: '11:00' },
  { name: 'LOTECE', time: '14:00', startTimeReal: '14:00', closeTimeReal: '14:00' },
  { name: 'LOTECE', time: '19:40', startTimeReal: '19:40', closeTimeReal: '19:40' },
  
  // LOTEP
  { name: 'LOTEP', time: '10:45', startTimeReal: '10:45', closeTimeReal: '10:45' },
  { name: 'LOTEP', time: '12:45', startTimeReal: '12:45', closeTimeReal: '12:45' },
  { name: 'LOTEP', time: '15:45', startTimeReal: '15:45', closeTimeReal: '15:45' },
  { name: 'LOTEP', time: '18:05', startTimeReal: '18:05', closeTimeReal: '18:05' },
  
  // LOOK
  { name: 'LOOK', time: '09:20', startTimeReal: '09:20', closeTimeReal: '09:20' },
  { name: 'LOOK', time: '11:20', startTimeReal: '11:20', closeTimeReal: '11:20' },
  { name: 'LOOK', time: '14:20', startTimeReal: '14:20', closeTimeReal: '14:20' },
  { name: 'LOOK', time: '16:20', startTimeReal: '16:20', closeTimeReal: '16:20' },
  { name: 'LOOK', time: '18:20', startTimeReal: '18:20', closeTimeReal: '18:20' },
  { name: 'LOOK', time: '21:20', startTimeReal: '21:20', closeTimeReal: '21:20' },
  { name: 'LOOK', time: '23:20', startTimeReal: '23:20', closeTimeReal: '23:20' },
  { name: 'LOOK', time: '07:20', startTimeReal: '07:20', closeTimeReal: '07:20' },
  
  // PARA TODOS
  { name: 'PARA TODOS', time: '09:45', startTimeReal: '09:45', closeTimeReal: '09:45' },
  { name: 'PARA TODOS', time: '20:40', startTimeReal: '20:40', closeTimeReal: '20:40', diasSemSorteio: [3] }, // Sem sorteio na quinta
  
  // PT RIO
  { name: 'PT RIO', time: '09:30', startTimeReal: '09:30', closeTimeReal: '09:30' },
  { name: 'PT RIO', time: '11:30', startTimeReal: '11:30', closeTimeReal: '11:30' },
  { name: 'PT RIO', time: '14:30', startTimeReal: '14:30', closeTimeReal: '14:30' },
  { name: 'PT RIO', time: '16:30', startTimeReal: '16:30', closeTimeReal: '16:30' },
  { name: 'PT RIO', time: '18:30', startTimeReal: '18:30', closeTimeReal: '18:30', diasSemSorteio: [3, 5] }, // Sem sorteio na quinta e sábado
  { name: 'PT RIO', time: '21:30', startTimeReal: '21:30', closeTimeReal: '21:30', diasSemSorteio: [3] }, // Sem sorteio na quinta
  
  // NACIONAL
  { name: 'NACIONAL', time: '08:00', startTimeReal: '08:00', closeTimeReal: '08:00' },
  { name: 'NACIONAL', time: '10:00', startTimeReal: '10:00', closeTimeReal: '10:00' },
  { name: 'NACIONAL', time: '12:00', startTimeReal: '12:00', closeTimeReal: '12:00' },
  { name: 'NACIONAL', time: '15:00', startTimeReal: '15:00', closeTimeReal: '15:00' },
  { name: 'NACIONAL', time: '17:00', startTimeReal: '17:00', closeTimeReal: '17:00' },
  { name: 'NACIONAL', time: '21:00', startTimeReal: '21:00', closeTimeReal: '21:00' },
  { name: 'NACIONAL', time: '23:00', startTimeReal: '23:00', closeTimeReal: '23:00' },
  { name: 'NACIONAL', time: '02:00', startTimeReal: '02:00', closeTimeReal: '02:00' },
  
  // PT BAHIA
  { name: 'PT BAHIA', time: '10:20', startTimeReal: '10:20', closeTimeReal: '10:20' },
  { name: 'PT BAHIA', time: '12:20', startTimeReal: '12:20', closeTimeReal: '12:20' },
  { name: 'PT BAHIA', time: '15:20', startTimeReal: '15:20', closeTimeReal: '15:20' },
  { name: 'PT BAHIA', time: '19:00', startTimeReal: '19:00', closeTimeReal: '19:00', diasSemSorteio: [3] }, // Sem sorteio na quinta
  { name: 'PT BAHIA', time: '21:20', startTimeReal: '21:20', closeTimeReal: '21:20', diasSemSorteio: [3] }, // Sem sorteio na quinta
  
  // FEDERAL
  { name: 'FEDERAL', time: '20:00', startTimeReal: '20:00', closeTimeReal: '20:00', diasSemSorteio: [0, 1, 2, 3, 4, 5] }, // Apenas sábado
  
  // PT SP
  { name: 'PT SP', time: '10:00', startTimeReal: '10:00', closeTimeReal: '10:00' },
  { name: 'PT SP', time: '13:15', startTimeReal: '13:15', closeTimeReal: '13:15' },
  { name: 'PT SP', time: '15:15', startTimeReal: '15:15', closeTimeReal: '15:15', diasSemSorteio: [3, 5] }, // Sem sorteio na quinta e sábado
  { name: 'PT SP', time: '17:15', startTimeReal: '17:15', closeTimeReal: '17:15', diasSemSorteio: [3, 5] }, // Sem sorteio na quinta e sábado
  { name: 'PT SP', time: '20:15', startTimeReal: '20:15', closeTimeReal: '20:15', diasSemSorteio: [3] }, // Sem sorteio na quinta
  
  // PT SP (Band)
  { name: 'PT SP (Band)', time: '15:15', startTimeReal: '15:15', closeTimeReal: '15:15', diasSemSorteio: [3, 5] },
]

/**
 * Busca horário real de apuração para uma extração/horário específico
 */
export function getHorarioRealApuracao(
  nomeExtracao: string,
  horarioExtracao: string
): HorarioRealApuracao | null {
  return (
    HORARIOS_REAIS_APURACAO.find(
      (h) =>
        h.name.toLowerCase() === nomeExtracao.toLowerCase() &&
        h.time === horarioExtracao
    ) || null
  )
}

/**
 * Verifica se tem sorteio no dia da semana especificado
 */
export function temSorteioNoDia(
  horarioReal: HorarioRealApuracao,
  diaSemana: number
): boolean {
  // Se não tem diasSemSorteio definido, tem sorteio todos os dias
  if (!horarioReal.diasSemSorteio || horarioReal.diasSemSorteio.length === 0) {
    return true
  }
  
  // Verifica se o dia da semana está na lista de dias sem sorteio
  return !horarioReal.diasSemSorteio.includes(diaSemana)
}
