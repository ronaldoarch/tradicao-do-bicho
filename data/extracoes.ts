export interface Extracao {
  id: number
  name: string
  estado?: string
  realCloseTime?: string
  closeTime: string
  time: string
  active: boolean
  max: number
  days: string
}

/**
 * Cada loteria tem várias extrações (horários) por dia.
 * Ex.: PT RIO 09:30, 11:30, 14:30, 16:30, 18:30, 21:30 | LOOK 07:20, 09:20, 11:20, 14:20, 16:20, 18:20, 21:20, 23:20
 *      NACIONAL 02:00, 08:00, 10:00, 12:00, 15:00, 17:00, 21:00, 23:00 | LOTECE 11:00, 14:00, 15:40, 19:40
 *      PT BAHIA 10:20, 12:20, 15:20, 19:00, 21:20 | LOTEP 10:45, 12:45, 15:45, 18:05 | PT SP 10:00, 13:15, 15:15, 17:15, 20:15
 * A liquidação casa aposta (loteria + horário) com o resultado da mesma extração.
 */
// Lista completa de 46 extrações com Close Time e Real Close Time
export const extracoes: Extracao[] = [
  { id: 1, name: 'LOTECE', estado: 'CE', realCloseTime: '10:26', closeTime: '11:00', time: '11:00', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb' },
  { id: 2, name: 'LOTECE', estado: 'CE', realCloseTime: '13:25', closeTime: '14:00', time: '14:00', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb' },
  { id: 3, name: 'LOTECE', estado: 'CE', realCloseTime: '19:10', closeTime: '19:40', time: '19:40', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb' },
  { id: 4, name: 'LOTEP', estado: 'PB', realCloseTime: '10:35', closeTime: '10:45', time: '10:45', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb, Dom' },
  { id: 5, name: 'LOTEP', estado: 'PB', realCloseTime: '12:35', closeTime: '12:45', time: '12:45', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb, Dom' },
  { id: 6, name: 'LOTEP', estado: 'PB', realCloseTime: '15:35', closeTime: '15:45', time: '15:45', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb' },
  { id: 7, name: 'LOTEP', estado: 'PB', realCloseTime: '17:51', closeTime: '18:05', time: '18:05', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb' },
  { id: 8, name: 'LOOK', estado: 'GO', realCloseTime: '11:05', closeTime: '11:20', time: '11:20', active: true, max: 10, days: 'Todos' },
  { id: 9, name: 'LOOK', estado: 'GO', realCloseTime: '14:05', closeTime: '14:20', time: '14:20', active: true, max: 10, days: 'Todos' },
  { id: 10, name: 'LOOK', estado: 'GO', realCloseTime: '16:05', closeTime: '16:20', time: '16:20', active: true, max: 10, days: 'Todos' },
  { id: 11, name: 'LOOK', estado: 'GO', realCloseTime: '18:05', closeTime: '18:20', time: '18:20', active: true, max: 10, days: 'Todos' },
  { id: 12, name: 'LOOK', estado: 'GO', realCloseTime: '21:05', closeTime: '21:20', time: '21:20', active: true, max: 10, days: 'Todos' },
  { id: 13, name: 'PARA TODOS', estado: 'BR', realCloseTime: '09:35', closeTime: '09:45', time: '09:45', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb, Dom' },
  { id: 14, name: 'PARA TODOS', estado: 'BR', realCloseTime: '20:20', closeTime: '20:40', time: '20:40', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb' },
  { id: 15, name: 'PT RIO', estado: 'RJ', realCloseTime: '11:20', closeTime: '11:30', time: '11:30', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb, Dom' },
  { id: 16, name: 'PT RIO', estado: 'RJ', realCloseTime: '14:20', closeTime: '14:30', time: '14:30', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb, Dom' },
  { id: 17, name: 'PT RIO', estado: 'RJ', realCloseTime: '16:20', closeTime: '16:30', time: '16:30', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb, Dom' },
  { id: 18, name: 'PT RIO', estado: 'RJ', realCloseTime: '18:20', closeTime: '18:30', time: '18:30', active: true, max: 10, days: 'Seg, Ter, Qua, Sex' },
  { id: 19, name: 'PT RIO', estado: 'RJ', realCloseTime: '21:20', closeTime: '21:30', time: '21:30', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb' },
  { id: 20, name: 'NACIONAL', estado: 'BR', realCloseTime: '07:45', closeTime: '08:00', time: '08:00', active: true, max: 10, days: 'Todos' },
  { id: 21, name: 'NACIONAL', estado: 'BR', realCloseTime: '09:45', closeTime: '10:00', time: '10:00', active: true, max: 10, days: 'Todos' },
  { id: 22, name: 'NACIONAL', estado: 'BR', realCloseTime: '11:45', closeTime: '12:00', time: '12:00', active: true, max: 10, days: 'Todos' },
  { id: 23, name: 'NACIONAL', estado: 'BR', realCloseTime: '14:45', closeTime: '15:00', time: '15:00', active: true, max: 10, days: 'Todos' },
  { id: 24, name: 'NACIONAL', estado: 'BR', realCloseTime: '16:45', closeTime: '17:00', time: '17:00', active: true, max: 10, days: 'Todos' },
  { id: 25, name: 'NACIONAL', estado: 'BR', realCloseTime: '20:45', closeTime: '21:00', time: '21:00', active: true, max: 10, days: 'Todos' },
  { id: 26, name: 'NACIONAL', estado: 'BR', realCloseTime: '22:45', closeTime: '23:00', time: '23:00', active: true, max: 10, days: 'Todos' },
  { id: 27, name: 'PT BAHIA', estado: 'BA', realCloseTime: '10:03', closeTime: '10:20', time: '10:20', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb, Dom' },
  { id: 28, name: 'PT BAHIA', estado: 'BA', realCloseTime: '12:03', closeTime: '12:20', time: '12:20', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb, Dom' },
  { id: 29, name: 'PT BAHIA', estado: 'BA', realCloseTime: '15:03', closeTime: '15:20', time: '15:20', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb, Dom' },
  { id: 30, name: 'PT BAHIA', estado: 'BA', realCloseTime: '18:43', closeTime: '19:00', time: '19:00', active: true, max: 10, days: 'Seg, Ter, Qua, Sex' },
  { id: 31, name: 'PT BAHIA', estado: 'BA', realCloseTime: '21:03', closeTime: '21:20', time: '21:20', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb' },
  { id: 32, name: 'FEDERAL', estado: 'BR', realCloseTime: '19:50', closeTime: '20:00', time: '20:00', active: true, max: 10, days: 'Sábado' },
  { id: 33, name: '—', estado: 'BR', realCloseTime: '', closeTime: '10:50', time: '10:50', active: false, max: 10, days: '—' },
  { id: 34, name: '—', estado: 'BR', realCloseTime: '', closeTime: '18:50', time: '18:50', active: false, max: 10, days: '—' },
  { id: 35, name: 'LOOK', estado: 'GO', realCloseTime: '09:05', closeTime: '09:20', time: '09:20', active: true, max: 10, days: 'Todos' },
  { id: 36, name: '—', estado: 'BR', realCloseTime: '', closeTime: '00:00', time: '00:00', active: false, max: 1, days: '—' },
  { id: 37, name: 'PT RIO', estado: 'RJ', realCloseTime: '09:20', closeTime: '09:30', time: '09:30', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb, Dom' },
  { id: 38, name: 'LOOK', estado: 'GO', realCloseTime: '23:10', closeTime: '23:20', time: '23:20', active: true, max: 10, days: 'Todos' },
  { id: 39, name: 'NACIONAL', estado: 'BR', realCloseTime: '01:51', closeTime: '02:00', time: '02:00', active: true, max: 10, days: 'Todos' },
  { id: 40, name: 'LOOK', estado: 'GO', realCloseTime: '07:05', closeTime: '07:20', time: '07:20', active: true, max: 10, days: 'Todos' },
  { id: 41, name: 'LOTECE', estado: 'CE', realCloseTime: '15:26', closeTime: '15:40', time: '15:40', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb' },
  { id: 42, name: 'PT SP', estado: 'SP', realCloseTime: '10:11', closeTime: '10:00', time: '10:00', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb, Dom' },
  { id: 43, name: 'PT SP', estado: 'SP', realCloseTime: '13:11', closeTime: '13:15', time: '13:15', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb, Dom' },
  { id: 44, name: 'PT SP (Band)', estado: 'SP', realCloseTime: '15:11', closeTime: '15:15', time: '15:15', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb' },
  { id: 45, name: 'PT SP', estado: 'SP', realCloseTime: '17:11', closeTime: '17:15', time: '17:15', active: true, max: 10, days: 'Seg, Ter, Qua, Sex, Sáb' },
  { id: 46, name: 'PT SP', estado: 'SP', realCloseTime: '20:11', closeTime: '20:15', time: '20:15', active: true, max: 10, days: 'Seg, Ter, Qua, Sex' },
]
