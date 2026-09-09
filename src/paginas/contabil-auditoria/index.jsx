import { useEffect, useState } from 'react';
import { CabecalhoContabil } from '../../componentes/contabil/CabecalhoContabil';
import { listarLogsAuditoria } from '../../servicos/auditoria';

const LIMITE_POR_PAGINA = 20;

const formatarData = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function LinhaLog({ log }) {
  const [expandido, setExpandido] = useState(false);
  const temDetalhes = log.dadosAntigos || log.dadosNovos;

  return (
    <>
      <tr
        onClick={() => temDetalhes && setExpandido((atual) => !atual)}
        className={temDetalhes ? 'cursor-pointer hover:bg-gray-50' : ''}
      >
        <td className="px-4 py-3 text-gray-600">{formatarData(log.criadoEm)}</td>
        <td className="px-4 py-3 font-medium text-gray-900">{log.acao}</td>
        <td className="px-4 py-3 text-gray-600">{log.recurso}</td>
        <td className="px-4 py-3 text-gray-500">{log.usuarioId ? 'Usuário' : 'Sistema'}</td>
        <td className="px-4 py-3 text-right text-gray-400">{temDetalhes && (expandido ? '▲' : '▼')}</td>
      </tr>
      {expandido && temDetalhes && (
        <tr>
          <td colSpan={5} className="bg-gray-50 px-4 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {log.dadosAntigos && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Antes</p>
                  <pre className="overflow-x-auto rounded-md bg-white p-2 text-xs text-gray-700">
                    {JSON.stringify(log.dadosAntigos, null, 2)}
                  </pre>
                </div>
              )}
              {log.dadosNovos && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Depois</p>
                  <pre className="overflow-x-auto rounded-md bg-white p-2 text-xs text-gray-700">
                    {JSON.stringify(log.dadosNovos, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ContabilAuditoria() {
  const [itens, setItens] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [recurso, setRecurso] = useState('');
  const [acao, setAcao] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  async function carregar() {
    setCarregando(true);
    try {
      const resultado = await listarLogsAuditoria({
        recurso: recurso || undefined,
        acao: acao || undefined,
        limit: LIMITE_POR_PAGINA,
        offset: pagina * LIMITE_POR_PAGINA,
      });
      setItens(resultado.itens);
      setTotal(resultado.total);
      setErro(null);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina]);

  function aoFiltrar(evento) {
    evento.preventDefault();
    setPagina(0);
    carregar();
  }

  const totalPaginas = Math.max(1, Math.ceil(total / LIMITE_POR_PAGINA));

  return (
    <div className="min-h-screen bg-gray-50">
      <CabecalhoContabil />

      <main className="mx-auto max-w-5xl px-6 py-6">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">Logs de auditoria</h1>

        <form onSubmit={aoFiltrar} className="mb-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Recurso</label>
            <input
              value={recurso}
              onChange={(e) => setRecurso(e.target.value)}
              placeholder="ex: certificados"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Ação</label>
            <input
              value={acao}
              onChange={(e) => setAcao(e.target.value)}
              placeholder="ex: certificado.revogar"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Filtrar
          </button>
        </form>

        {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        {carregando ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">Nenhum registro encontrado.</p>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Quando</th>
                    <th className="px-4 py-3">Ação</th>
                    <th className="px-4 py-3">Recurso</th>
                    <th className="px-4 py-3">Origem</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {itens.map((log) => (
                    <LinhaLog key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>
                Página {pagina + 1} de {totalPaginas} · {total} registro{total !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagina((p) => Math.max(0, p - 1))}
                  disabled={pagina === 0}
                  className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPagina((p) => (p + 1 < totalPaginas ? p + 1 : p))}
                  disabled={pagina + 1 >= totalPaginas}
                  className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
