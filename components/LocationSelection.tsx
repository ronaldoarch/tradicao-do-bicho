'use client'

import { LOCATIONS, SPECIAL_TIMES } from '@/data/modalities'

interface LocationSelectionProps {
  instant: boolean
  location: string | null
  specialTime: string | null
  onInstantChange: (checked: boolean) => void
  onLocationChange: (locationId: string) => void
  onSpecialTimeChange: (timeId: string | null) => void
}

export default function LocationSelection({
  instant,
  location,
  specialTime,
  onInstantChange,
  onLocationChange,
  onSpecialTimeChange,
}: LocationSelectionProps) {
  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-gray-950">Selecione a localização e horário:</h2>

      {/* Instant Checkbox */}
      <div className="mb-6">
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-blue/50 transition-colors">
          <input
            type="checkbox"
            checked={instant}
            onChange={(e) => onInstantChange(e.target.checked)}
            className="h-5 w-5 accent-blue"
          />
          <span className="text-lg font-semibold text-gray-950">INSTANTANEA</span>
        </label>
      </div>

      {/* Locations */}
      <div className="mb-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-950">Localizações:</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {LOCATIONS.map((loc) => (
            <button
              key={loc.id}
              onClick={() => onLocationChange(loc.id)}
              className={`flex items-center justify-center gap-3 rounded-lg border-2 p-4 transition-all hover:scale-105 ${
                location === loc.id
                  ? 'border-blue bg-blue/10 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-blue/50'
              }`}
            >
              <span className="font-semibold text-gray-950">{loc.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Special Times */}
      {!instant && (
        <div className="mb-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-950">Horários Especiais:</h3>
          <div className="space-y-3">
            {SPECIAL_TIMES.map((time) => (
              <label
                key={time.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                  specialTime === time.id
                    ? 'border-blue bg-blue/10'
                    : 'border-gray-200 bg-white hover:border-blue/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={specialTime === time.id}
                  onChange={(e) => onSpecialTimeChange(e.target.checked ? time.id : null)}
                  className="h-5 w-5 accent-blue"
                />
                <span className="font-semibold text-gray-950">{time.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
