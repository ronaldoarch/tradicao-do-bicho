import { MODALITIES as MODALITIES_DATA } from '@/data/modalities'
import { Modality } from '@/types/bet'

// Store compartilhado para modalidades (em produção, usar banco de dados)
// Inicializa todas as modalidades como ativas por padrão
let modalidades: Modality[] = MODALITIES_DATA.map((m) => ({
  ...m,
  active: m.active !== undefined ? m.active : true, // Por padrão, todas são ativas
}))

export function getModalidades(): Modality[] {
  return modalidades
}

export function updateModalidade(id: number, updates: Partial<Modality>): Modality | null {
  const index = modalidades.findIndex((m) => m.id === id)
  if (index === -1) {
    return null
  }
  modalidades[index] = { ...modalidades[index], ...updates }
  return modalidades[index]
}

export function setModalidades(newModalidades: Modality[]) {
  modalidades = newModalidades
}
