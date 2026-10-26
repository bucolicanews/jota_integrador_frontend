import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { PAPEIS_PLATAFORMA } from '../../componentes/contabil/CabecalhoContabil';
import LayoutPrincipal from '../../components/layout/LayoutPrincipal';
import ModalCadastrarEmpresa from '../../components/empresas/ModalCadastrarEmpresa';
import { listarEmpresas } from '../../servicos/empresas';
import { useEmpresaAtiva } from '../../hooks/useEmpresaAtiva';

const ROTULO_MODO_ACESSO = {
  procuracao: 'Procuração',
  certificado_proprio: 'Certificado próprio',
};

function BadgeStatus({ bloqueado }) {
  return bloqueado ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
      🔴 Bloqueada
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
      🟢 Ativa
    </span>
  );
}


export default function ContabilEmpresas() {
  const navegar = useNavigate();
  const { usuario } = useSelector((state) => state.autenticacao);
  const ehPlataforma = PAPEIS_PLATAFORMA.includes(usuario?.papel);
  const { selecionarEmpresa } = useEmpresaAtiva();
  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const dados = await listarEmpresas();
      setEmpresas(dados);
      setErro(null);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setCarregando(false);
    }
  }

  // Esta tela só existe pra "a carteira do próprio contador" (listarEmpresas() sem
  // contadorId) -- plataforma não tem carteira própria, o equivalente dela é "Empresas
  // (todas)". Redireciona em vez de deixar o 400 do backend estourar na tela.
  useEffect(() => {
    if (ehPlataforma) {
      navegar('/contabil/empresas-todas', { replace: true });
      return;
    }
    carregar();
  }, [ehPlataforma]);

  if (ehPlataforma) return null;

  const empresasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return empresas;
    return empresas.filter(
      (empresa) => empresa.razaoSocial.toLowerCase().includes(termo) || empresa.cnpj.includes(termo),
    );
  }, [empresas, busca]);

  const totalAtivas = empresas.filter((e) => !e.bloqueado).length;
  const totalBloqueadas = empresas.length - totalAtivas;

  function aoCriarEmpresa(nova) {
    setModalAberto(false);
    setEmpresas((atual) => [...atual, nova]);
    navegar(`/contabil/empresas/${nova.id}`);
  }

  // Atalho pra pular direto pro painel (rotas globais /lancamentos, /plano-contas etc, com
  // o menu lateral completo) sem passar pela tela de detalhe da empresa -- fluxo antigo
  // exigia clicar na empresa, depois numa aba, só então chegava no painel de verdade.
  function aoAbrirPainel(evento, empresa) {
    evento.stopPropagation();
    selecionarEmpresa(empresa);
    navegar('/painel');
  }

  return (
    <LayoutPrincipal>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Carteira de Empresas</h1>
            <p className="text-sm text-gray-500">
              {empresas.length} {empresas.length === 1 ? 'empresa' : 'empresas'} · {totalAtivas} ativas
              {totalBloqueadas > 0 && ` · ${totalBloqueadas} bloqueadas`}
            </p>
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Nova empresa
          </button>
        </div>

        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por razão social ou CNPJ..."
          className="mb-4 w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm"
        />

        {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">Erro ao carregar: {erro}</p>}

        {carregando ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : empresasFiltradas.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">
            {empresas.length === 0 ? 'Nenhuma empresa cadastrada ainda.' : 'Nenhuma empresa encontrada para essa busca.'}
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Razão social</th>
                  <th className="px-4 py-3">CNPJ</th>
                  <th className="px-4 py-3">Acesso SERPRO</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {empresasFiltradas.map((empresa) => (
                  <tr
                    key={empresa.id}
                    onClick={() => navegar(`/contabil/empresas/${empresa.id}`)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navegar(`/contabil/empresas/${empresa.id}`);
                    }}
                    className="cursor-pointer hover:bg-gray-50 focus:bg-blue-50 focus:outline-none"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{empresa.razaoSocial}</p>
                      {empresa.nomeFantasia && <p className="text-xs text-gray-500">{empresa.nomeFantasia}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{empresa.cnpj}</td>
                    <td className="px-4 py-3 text-gray-600">{ROTULO_MODO_ACESSO[empresa.modoAcessoSerpro]}</td>
                    <td className="px-4 py-3 text-gray-600">{empresa.planoNome ?? '—'}</td>
                    <td className="px-4 py-3">
                      <BadgeStatus bloqueado={empresa.bloqueado} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(evento) => aoAbrirPainel(evento, empresa)}
                        title="Ir direto pro painel desta empresa (Lançamentos, Plano de Contas, etc.)"
                        className="rounded-md border border-blue-300 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                      >
                        Abrir Painel →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAberto && (
        <ModalCadastrarEmpresa
          ehSuperAdmin={false}
          meuContadorId={usuario?.contadorId}
          aoFechar={() => setModalAberto(false)}
          aoCriar={aoCriarEmpresa}
        />
      )}
    </LayoutPrincipal>
  );
}
