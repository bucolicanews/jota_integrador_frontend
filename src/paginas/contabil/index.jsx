import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { api } from '../../servicos/api';
import { listarEmpresas } from '../../servicos/empresas';
import { CabecalhoContabil } from '../../componentes/contabil/CabecalhoContabil';

export default function Contabil() {
  const { usuario } = useSelector((state) => state.autenticacao);
  const [contador, setContador] = useState(null);
  const [saldo, setSaldo] = useState(null);
  const [empresas, setEmpresas] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    // Papel de plataforma (SUPER_ADMIN/ADMIN_FINANCEIRO/ADMIN_SUPORTE) não tem
    // contadorId próprio -- este dashboard é a visão de UM contador específico, não faz
    // sentido pra quem não é contador. Não tenta carregar (evita erro 400 confuso do
    // backend em cascata pra cada chamada).
    if (!usuario?.contadorId) return;

    async function carregar() {
      try {
        const dadosContador = await api.get('/contadores/me');
        setContador(dadosContador);
        const [dadosSaldo, dadosEmpresas] = await Promise.all([
          api.get(`/contadores/${dadosContador.id}/creditos/saldo`),
          listarEmpresas(),
        ]);
        setSaldo(dadosSaldo.saldo);
        setEmpresas(dadosEmpresas);
      } catch (erroRequisicao) {
        setErro(erroRequisicao.message);
      }
    }
    carregar();
  }, [usuario]);

  const totalAtivas = empresas?.filter((e) => !e.bloqueado).length ?? 0;
  const totalBloqueadas = empresas ? empresas.length - totalAtivas : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <CabecalhoContabil />

      <main className="mx-auto max-w-6xl px-6 py-6">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">Dashboard</h1>

        {!usuario?.contadorId ? (
          <p className="rounded-lg bg-white p-6 text-sm text-gray-500 shadow">
            Este dashboard mostra os dados de um contador específico -- entre com uma conta de contador para ver.
          </p>
        ) : (
          <>
        {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">Erro ao carregar: {erro}</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-500">Escritório</p>
            <p className="text-xl font-semibold text-gray-900">{contador?.nome ?? '...'}</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-500">Créditos disponíveis</p>
            <p className="text-2xl font-bold text-blue-600">{saldo ?? '...'}</p>
          </div>

          <Link to="/contabil/empresas" className="rounded-lg bg-white p-6 shadow transition hover:shadow-md">
            <p className="text-sm text-gray-500">Carteira de empresas</p>
            <p className="text-2xl font-bold text-gray-900">{empresas?.length ?? '...'}</p>
            {empresas && (
              <p className="mt-1 text-xs text-gray-500">
                🟢 {totalAtivas} ativas{totalBloqueadas > 0 && ` · 🔴 ${totalBloqueadas} bloqueadas`}
              </p>
            )}
          </Link>
        </div>
          </>
        )}
      </main>
    </div>
  );
}
