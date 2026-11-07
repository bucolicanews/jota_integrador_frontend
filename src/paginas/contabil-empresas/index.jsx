import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { PAPEIS_PLATAFORMA } from '../../componentes/contabil/CabecalhoContabil';
import LayoutPrincipal from '../../components/layout/LayoutPrincipal';
import ModalCadastrarEmpresa from '../../components/empresas/ModalCadastrarEmpresa';
import { bloquearEmpresa, desbloquearEmpresa, listarEmpresas } from '../../servicos/empresas';
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


function ModalBloqueio({ empresa, aoFechar, aoConfirmar }) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  async function confirmar() {
    if (!motivo.trim()) {
      setErro('Informe o motivo do bloqueio.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await bloquearEmpresa(empresa.id, motivo.trim());
      aoConfirmar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message ?? 'Não foi possível bloquear');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Bloquear {empresa.razaoSocial}</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Motivo do bloqueio *</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={aoFechar} className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmar}
              disabled={enviando}
              className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {enviando ? 'Bloqueando...' : 'Bloquear'}
            </button>
          </div>
        </div>
      </div>
    </div>
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
  const [empresaParaBloquear, setEmpresaParaBloquear] = useState(null);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState(null);

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
  }, [ehPlataforma, navegar]);

  const empresasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return empresas;
    return empresas.filter(
      (empresa) => empresa.razaoSocial.toLowerCase().includes(termo) || empresa.cnpj.includes(termo),
    );
  }, [empresas, busca]);

  if (ehPlataforma) return null;

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

  function aoClicarEditar(evento, empresa) {
    evento.stopPropagation();
    navegar(`/contabil/empresas/${empresa.id}`);
  }

  // /contabil/assinatura lê a empresa de useEmpresaAtiva (estado global, não :id na URL)
  // -- mesmo truque de aoAbrirPainel, só que pro destino de gerenciar plano.
  function aoClicarEditarPlano(evento, empresa) {
    evento.stopPropagation();
    selecionarEmpresa(empresa);
    navegar('/contabil/assinatura');
  }

  async function aoDesbloquear(evento, empresa) {
    evento.stopPropagation();
    if (!window.confirm(`Desbloquear ${empresa.razaoSocial}?`)) return;
    setAcaoEmAndamento(empresa.id);
    try {
      await desbloquearEmpresa(empresa.id);
      await carregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setAcaoEmAndamento(null);
    }
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
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={(evento) => aoClicarEditar(evento, empresa)}
                          className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Editar
                        </button>
                        {empresa.bloqueado ? (
                          <button
                            type="button"
                            onClick={(evento) => aoDesbloquear(evento, empresa)}
                            disabled={acaoEmAndamento === empresa.id}
                            className="rounded-md border border-green-300 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                          >
                            Desbloquear
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(evento) => {
                              evento.stopPropagation();
                              setEmpresaParaBloquear(empresa);
                            }}
                            className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Bloquear
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(evento) => aoClicarEditarPlano(evento, empresa)}
                          className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Editar Plano
                        </button>
                        <button
                          type="button"
                          onClick={(evento) => aoAbrirPainel(evento, empresa)}
                          title="Ir direto pro painel desta empresa (Lançamentos, Plano de Contas, etc.)"
                          className="rounded-md border border-blue-300 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                        >
                          Abrir Painel →
                        </button>
                      </div>
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

      {empresaParaBloquear && (
        <ModalBloqueio
          empresa={empresaParaBloquear}
          aoFechar={() => setEmpresaParaBloquear(null)}
          aoConfirmar={() => {
            setEmpresaParaBloquear(null);
            carregar();
          }}
        />
      )}
    </LayoutPrincipal>
  );
}
