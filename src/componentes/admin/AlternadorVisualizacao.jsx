/**
 * Alternância lista/cards -- padrão compartilhado por todas as telas de listagem do admin
 * (Contadores, e futuramente Clientes/Empresas etc.). Manter a mesma UI em todas.
 */
export function AlternadorVisualizacao({ visualizacao, aoAlternar }) {
  return (
    <div className="inline-flex rounded-md border border-gray-300 bg-white p-0.5">
      <button
        type="button"
        onClick={() => aoAlternar('lista')}
        title="Ver em lista"
        className={`rounded px-2.5 py-1.5 text-sm ${
          visualizacao === 'lista' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
        }`}
      >
        ☰ Lista
      </button>
      <button
        type="button"
        onClick={() => aoAlternar('cards')}
        title="Ver em cards"
        className={`rounded px-2.5 py-1.5 text-sm ${
          visualizacao === 'cards' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
        }`}
      >
        ▦ Cards
      </button>
    </div>
  );
}
