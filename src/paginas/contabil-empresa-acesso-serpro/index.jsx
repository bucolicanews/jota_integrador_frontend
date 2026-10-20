import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import LayoutPrincipal from '../../components/layout/LayoutPrincipal';
import SecaoCertificadoSerpro from '../../components/empresas/SecaoCertificadoSerpro';
import { obterEmpresa } from '../../servicos/empresas';
import { atualizarStatusProcuracao, obterProcuracao } from '../../servicos/acessoSerpro';

const PAPEIS_PLATAFORMA = ['SUPER_ADMIN', 'ADMIN_FINANCEIRO', 'ADMIN_SUPORTE'];

const STATUS_PROCURACAO = {
  pendente: { rotulo: 'Pendente', cor: 'bg-amber-50 text-amber-700', icone: '🟡' },
  ativa: { rotulo: 'Ativa', cor: 'bg-green-50 text-green-700', icone: '🟢' },
  expirada: { rotulo: 'Expirada', cor: 'bg-orange-50 text-orange-700', icone: '🟠' },
  revogada: { rotulo: 'Revogada', cor: 'bg-red-50 text-red-700', icone: '🔴' },
};

function formatarData(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function SecaoProcuracao({ empresaId, podeEditar }) {
  const [procuracao, setProcuracao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  async function carregar() {
    setCarregando(true);
    try {
      const dados = await obterProcuracao(empresaId);
      setProcuracao(dados);
      reset({
        status: dados.status,
        outorgadaEm: dados.outorgadaEm ? dados.outorgadaEm.slice(0, 10) : '',
        expiraEm: dados.expiraEm ? dados.expiraEm.slice(0, 10) : '',
      });
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
  }, [empresaId]);

  async function aoSalvar(dados) {
    setSalvando(true);
    try {
      await atualizarStatusProcuracao(empresaId, {
        status: dados.status,
        outorgadaEm: dados.outorgadaEm || undefined,
        expiraEm: dados.expiraEm || undefined,
      });
      setEditando(false);
      await carregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <p className="text-sm text-gray-500">Carregando...</p>;
  if (erro && !procuracao) return <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>;

  const info = STATUS_PROCURACAO[procuracao.status];

  const MENSAGEM_POR_STATUS = {
    pendente: 'A empresa ainda não outorgou a procuração eletrônica. Outorgue no gov.br (e-CAC) para liberar as consultas fiscais.',
    ativa: 'Procuração ativa — a Jota já pode consultar os dados fiscais desta empresa.',
    expirada: 'A procuração venceu. É preciso renovar no gov.br para continuar consultando.',
    revogada: 'A procuração foi revogada. Uma nova precisa ser outorgada no gov.br.',
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Procuração eletrônica</h2>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${info.cor}`}>
          {info.icone} {info.rotulo}
        </span>
      </div>

      {erro && <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

      <p className="mb-4 text-sm text-gray-600">{MENSAGEM_POR_STATUS[procuracao.status]}</p>

      <dl className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500">Outorgada em</dt>
          <dd className="font-medium text-gray-900">{formatarData(procuracao.outorgadaEm)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Válida até</dt>
          <dd className="font-medium text-gray-900">{formatarData(procuracao.expiraEm)}</dd>
        </div>
      </dl>

      {podeEditar && !editando && (
        <button
          onClick={() => setEditando(true)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Sincronizar status manualmente
        </button>
      )}

      {podeEditar && editando && (
        <form onSubmit={handleSubmit(aoSalvar)} className="space-y-3 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500">
            Só a equipe da Jota pode atualizar isso manualmente (sincronização automática com o SERPRO ainda não existe).
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select {...register('status')} className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="pendente">Pendente</option>
              <option value="ativa">Ativa</option>
              <option value="expirada">Expirada</option>
              <option value="revogada">Revogada</option>
            </select>
          </div>
          <div className="flex gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Outorgada em</label>
              <input type="date" {...register('outorgadaEm')} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Válida até</label>
              <input type="date" {...register('expiraEm')} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function SecaoCertificado({ empresaId }) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Certificado digital</h2>
      <SecaoCertificadoSerpro empresaId={empresaId} />
    </div>
  );
}

export default function ContabilEmpresaAcessoSerpro() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { usuario } = useSelector((state) => state.autenticacao);
  const [empresa, setEmpresa] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    obterEmpresa(id)
      .then(setEmpresa)
      .catch((erroRequisicao) => setErro(erroRequisicao.message));
  }, [id]);

  return (
    <LayoutPrincipal>
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => navegar(`/contabil/empresas/${id}`)}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Voltar pra empresa
        </button>

        {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        {empresa && (
          <>
            <h1 className="mb-1 text-xl font-semibold text-gray-900">{empresa.razaoSocial}</h1>
            <p className="mb-6 text-sm text-gray-500">Acesso ao SERPRO / Integra Contador</p>

            {empresa.modoAcessoSerpro === 'procuracao' ? (
              <SecaoProcuracao empresaId={id} podeEditar={PAPEIS_PLATAFORMA.includes(usuario?.papel)} />
            ) : (
              <SecaoCertificado empresaId={id} />
            )}
          </>
        )}
      </div>
    </LayoutPrincipal>
  );
}
