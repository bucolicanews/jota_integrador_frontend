import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { CabecalhoContabil } from '../../componentes/contabil/CabecalhoContabil';
import { obterEmpresa } from '../../servicos/empresas';
import {
  atualizarStatusProcuracao,
  cadastrarOuRotacionarCertificado,
  listarCertificados,
  obterProcuracao,
  revogarCertificado,
} from '../../servicos/acessoSerpro';

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

const STATUS_CERTIFICADO = {
  ativo: { rotulo: 'Ativo', cor: 'bg-green-50 text-green-700', icone: '🟢' },
  expirado: { rotulo: 'Expirado', cor: 'bg-orange-50 text-orange-700', icone: '🟠' },
  revogado: { rotulo: 'Revogado', cor: 'bg-red-50 text-red-700', icone: '🔴' },
  substituido: { rotulo: 'Substituído', cor: 'bg-gray-100 text-gray-600', icone: '⚪' },
};

function FormularioCertificado({ empresaId, temAtivo, aoConcluir, aoCancelar }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm({
    defaultValues: { tipo: 'A1', validadeInicio: '', validadeFim: '' },
  });

  async function aoSubmeter(dados) {
    const arquivo = dados.arquivo?.[0];
    if (!arquivo) {
      setError('arquivo', { message: 'Selecione o arquivo do certificado' });
      return;
    }
    try {
      await cadastrarOuRotacionarCertificado(empresaId, {
        arquivo,
        tipo: dados.tipo,
        senha: dados.senha,
        validadeInicio: dados.validadeInicio || undefined,
        validadeFim: dados.validadeFim,
      });
      aoConcluir();
    } catch (erro) {
      setError('root', { message: erro.message ?? 'Não foi possível cadastrar o certificado' });
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3 border-t border-gray-100 pt-4">
      <p className="text-xs text-gray-500">
        {temAtivo
          ? 'Cadastrar aqui substitui o certificado atual (rotação) -- o antigo fica marcado como substituído, nunca apagado.'
          : 'O arquivo é cifrado antes de ser armazenado -- nunca fica acessível em texto claro, nem pra nós.'}
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
        <select {...register('tipo')} className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="A1">A1 (arquivo)</option>
          <option value="A3" disabled>
            A3 (token/hardware) — indisponível ainda
          </option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Arquivo (.pfx / .p12) *</label>
        <input type="file" accept=".pfx,.p12" {...register('arquivo')} className="w-full text-sm" />
        {errors.arquivo && <p className="mt-1 text-xs text-red-600">{errors.arquivo.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Senha do certificado *</label>
        <input
          type="password"
          {...register('senha', { required: 'Obrigatório' })}
          className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {errors.senha && <p className="mt-1 text-xs text-red-600">{errors.senha.message}</p>}
      </div>

      <div className="flex gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Válido a partir de</label>
          <input type="date" {...register('validadeInicio')} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Válido até *</label>
          <input
            type="date"
            {...register('validadeFim', { required: 'Obrigatório' })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {errors.validadeFim && <p className="mt-1 text-xs text-red-600">{errors.validadeFim.message}</p>}
        </div>
      </div>

      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={aoCancelar}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Enviando...' : temAtivo ? 'Rotacionar certificado' : 'Cadastrar certificado'}
        </button>
      </div>
    </form>
  );
}

function SecaoCertificado({ empresaId }) {
  const [certificados, setCertificados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [revogando, setRevogando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const dados = await listarCertificados(empresaId);
      setCertificados(dados);
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

  async function aoRevogar() {
    if (!window.confirm('Revogar o certificado ativo? A empresa ficará sem acesso ao SERPRO até um novo ser cadastrado.')) return;
    setRevogando(true);
    try {
      await revogarCertificado(empresaId);
      await carregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setRevogando(false);
    }
  }

  if (carregando) return <p className="text-sm text-gray-500">Carregando...</p>;

  const ativo = certificados.find((c) => c.status === 'ativo');
  const historico = certificados.filter((c) => c.status !== 'ativo');

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Certificado digital</h2>

      {erro && <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

      {ativo ? (
        <div className="mb-4 flex items-center justify-between rounded-md border border-gray-200 p-4">
          <div>
            <span
              className={`mb-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CERTIFICADO.ativo.cor}`}
            >
              {STATUS_CERTIFICADO.ativo.icone} Ativo
            </span>
            <p className="mt-1 text-sm text-gray-600">
              Tipo {ativo.tipo} · Válido até {formatarData(ativo.validadeFim)}
            </p>
          </div>
          <button
            onClick={aoRevogar}
            disabled={revogando}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {revogando ? 'Revogando...' : 'Revogar'}
          </button>
        </div>
      ) : (
        <p className="mb-4 text-sm text-gray-600">Nenhum certificado ativo cadastrado — as consultas ao SERPRO ficam bloqueadas até haver um.</p>
      )}

      {!mostrarForm && (
        <button
          onClick={() => setMostrarForm(true)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {ativo ? 'Rotacionar certificado' : '+ Cadastrar certificado'}
        </button>
      )}

      {mostrarForm && (
        <FormularioCertificado
          empresaId={empresaId}
          temAtivo={!!ativo}
          aoConcluir={() => {
            setMostrarForm(false);
            carregar();
          }}
          aoCancelar={() => setMostrarForm(false)}
        />
      )}

      {historico.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Histórico</h3>
          <ul className="space-y-1.5 text-sm text-gray-600">
            {historico.map((cert) => {
              const info = STATUS_CERTIFICADO[cert.status];
              return (
                <li key={cert.id} className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${info.cor}`}>
                    {info.icone} {info.rotulo}
                  </span>
                  <span>
                    {cert.tipo} · cadastrado em {formatarData(cert.criadoEm)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
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
    <div className="min-h-screen bg-gray-50">
      <CabecalhoContabil />

      <main className="mx-auto max-w-3xl px-6 py-6">
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
      </main>
    </div>
  );
}
