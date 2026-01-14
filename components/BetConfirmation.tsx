'use client'

import { ANIMALS } from '@/data/animals'
import { MODALITIES } from '@/data/modalities'
import { BetData } from '@/types/bet'

interface BetConfirmationProps {
  betData: BetData
  onConfirm: () => void
  onBack: () => void
}

export default function BetConfirmation({ betData, onConfirm, onBack }: BetConfirmationProps) {
  const selectedGroups = betData.animalBets || []
  const flatSelectedIds = selectedGroups.flat()
  const selectedAnimals = ANIMALS.filter((animal) => flatSelectedIds.includes(animal.id))

  const calculateTotal = () => {
    let total = betData.amount
    if (betData.divisionType === 'each') {
      total = total * selectedGroups.length
    }
    if (betData.useBonus && betData.bonusAmount > 0) {
      total = Math.max(0, total - betData.bonusAmount)
    }
    return total
  }

  const total = calculateTotal()

  const selectedModality = betData.modality
    ? MODALITIES.find((m) => m.id.toString() === betData.modality)
    : null

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-gray-950">Confirmação da Aposta</h2>

      <div className="space-y-6 rounded-lg border-2 border-gray-200 bg-white p-6">
        {/* Modality */}
        {selectedModality && (
          <div>
            <h3 className="mb-2 font-semibold text-gray-700">Modalidade:</h3>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-950">{selectedModality.name}</span>
              <span className="font-bold text-blue">{selectedModality.value}</span>
            </div>
          </div>
        )}

        {/* Animals */}
        <div>
          <h3 className="mb-2 font-semibold text-gray-700">Palpites de animais:</h3>
          <div className="space-y-2">
            {selectedGroups.map((grp, idx) => (
              <div key={idx} className="flex flex-wrap gap-2">
                <span className="rounded-lg bg-amber-200 px-3 py-1 text-sm font-semibold text-gray-900">
                  {grp.map((n) => String(n).padStart(2, '0')).join('-')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Position */}
        {betData.position && (
          <div>
            <h3 className="mb-2 font-semibold text-gray-700">Posição:</h3>
            <p className="text-gray-950">{betData.position}</p>
            {betData.customPosition && (
              <p className="text-sm text-gray-500">(Personalizado)</p>
            )}
          </div>
        )}

        {/* Amount */}
        <div>
          <h3 className="mb-2 font-semibold text-gray-700">Valor:</h3>
          <p className="text-lg font-bold text-gray-950">
            R$ {betData.amount.toFixed(2)} {betData.divisionType === 'each' ? 'por palpite' : 'total'}
          </p>
        </div>

        {/* Division */}
        <div>
          <h3 className="mb-2 font-semibold text-gray-700">Divisão:</h3>
          <p className="text-gray-950">
            {betData.divisionType === 'all' ? 'Para todo o palpite' : 'Para cada palpite'}
          </p>
        </div>

        {/* Location */}
        {betData.location && (
          <div>
            <h3 className="mb-2 font-semibold text-gray-700">Localização:</h3>
            <p className="text-gray-950">{betData.location}</p>
          </div>
        )}

        {/* Instant */}
        {betData.instant && (
          <div>
            <p className="font-semibold text-yellow">✓ Sorteio Instantâneo</p>
          </div>
        )}

        {/* Bonus */}
        {betData.useBonus && betData.bonusAmount > 0 && (
          <div className="rounded-lg bg-yellow/10 p-3">
            <p className="font-semibold text-gray-950">
              Bônus aplicado: -R$ {betData.bonusAmount.toFixed(2)}
            </p>
          </div>
        )}

        {/* Total */}
        <div className="border-t-2 border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-gray-950">Total:</span>
            <span className="text-2xl font-extrabold text-blue">R$ {total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-6 flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Voltar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 rounded-lg bg-yellow px-6 py-3 font-bold text-blue-950 hover:bg-yellow/90 transition-colors"
        >
          Confirmar Aposta
        </button>
      </div>
    </div>
  )
}
