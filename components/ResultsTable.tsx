'use client'

import { SAMPLE_RESULTS, ResultData } from '@/data/results'
import { ResultadoItem } from '@/types/resultados'

interface ResultsTableProps {
  date?: string
  location?: string
  drawTime?: string
  results?: ResultadoItem[]
}

export default function ResultsTable({
  date = '10/01/2026',
  location = 'Rio de Janeiro',
  drawTime = 'PT-RIO 9h20',
  results,
}: ResultsTableProps) {
  const rows: (ResultadoItem | ResultData)[] = results && results.length > 0 ? results : SAMPLE_RESULTS

  return (
    <div className="overflow-x-auto rounded-xl bg-white">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-950">
          {date} - {drawTime}
        </h2>
        <p className="text-sm text-gray-600">Local: {location}</p>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prêmio</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Milhar</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Grupo</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Animal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((result, index) => (
            <tr
              key={index}
              className="border-b border-gray-100 hover:bg-blue/5 transition-colors"
            >
              <td className="px-4 py-3 font-bold text-blue">{result.position}</td>
              <td className="px-4 py-3 font-semibold text-gray-950">{result.milhar}</td>
              <td className="px-4 py-3 text-gray-700">{result.grupo}</td>
              <td className="px-4 py-3 text-gray-700">{result.animal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
