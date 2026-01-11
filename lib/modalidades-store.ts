import { MODALITIES as MODALITIES_DATA } from '@/data/modalities'
import { Modality } from '@/types/bet'

// Store compartilhado para modalidades (em produção, usar banco de dados)
let modalidades: Modality[] = [...MODALITIES_DATA]

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
