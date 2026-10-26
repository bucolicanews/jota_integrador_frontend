import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import DOMPurify from 'dompurify';
import LayoutPrincipal from '../../components/layout/LayoutPrincipal';
import { api } from '../../servicos/api';
import { cadastrarOuRotacionarCertificado, listarCertificados, obterProcuracao, testarCertificado } from '../../servicos/acessoSerpro';
import { atualizarEmpresa } from '../../servicos/empresas';
import CardComprarCreditosAvulsos from '../../components/empresas/CardComprarCreditosAvulsos';
import CardMinhaAssinatura from '../../components/empresas/CardMinhaAssinatura';
import { diasRestantesCertificado, statusExpiracaoCertificado } from '../../utils/certificadoExpiracao';
import { REGIMES_TRIBUTARIOS } from '../../constantes/regimesTributarios';

const formatarCnpj = (valor) => {
  const digitos = (valor ?? '').replace(/\D/g, '');
  return digitos.length === 14 ? digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : valor ?? '';
};
import {
  listarMensagensCaixaPostal,
  marcarMensagemComoLida,
  obterDetalheMensagem,
  sincronizarCaixaPostal,
} from '../../servicos/caixaPostal';

const formatarData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

/**
 * Perfil JOTA FISCAL (empresário) -- linguagem 100% não-técnica, semáforo 🟢🟡🔴 como
 * padrão visual consistente (docs/UX-UI.md). Roda dentro do mesmo LayoutPrincipal/
 * MenuLateral do JOTA CONTÁBIL (empresa ganha sidebar com os módulos que o contador
 * licenciou pra ela) -- só o conteúdo desta página é o dashboard enxuto original.
 */

const MENSAGEM_PROCURACAO = {
  pendente: {
    icone: '🟡',
    titulo: 'Aguardando sua procuração',
    texto: 'Para liberarmos as consultas fiscais da sua empresa, é preciso outorgar a procuração eletrônica no portal e-CAC (gov.br).',
  },
  ativa: {
    icone: '🟢',
    titulo: 'Tudo certo com seu acesso',
    texto: 'Sua procuração está ativa — já podemos consultar os dados fiscais da sua empresa.',
  },
  expirada: {
    icone: '🟠',
    titulo: 'Sua procuração venceu',
    texto: 'Renove a procuração no e-CAC (gov.br) para continuarmos consultando seus dados fiscais.',
  },
  revogada: {
    icone: '🔴',
    titulo: 'Procuração revogada',
    texto: 'Sua procuração foi revogada. Outorgue uma nova no e-CAC (gov.br) para retomarmos o acesso.',
  },
};

function CardProcuracao({ empresaId }) {
  const [procuracao, setProcuracao] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    obterProcuracao(empresaId)
      .then(setProcuracao)
      .catch((e) => setErro(e.message));
  }, [empresaId]);

  if (erro) return <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">Não conseguimos verificar seu acesso agora.</p>;
  if (!procuracao) return <p className="text-sm text-gray-500">Verificando...</p>;

  const info = MENSAGEM_PROCURACAO[procuracao.status];

  return (
    <div>
      <p className="text-base font-medium text-gray-900">
        {info.icone} {info.titulo}
      </p>
      <p className="mt-1 text-sm text-gray-600">{info.texto}</p>
      {procuracao.status === 'ativa' && procuracao.expiraEm && (
        <p className="mt-1 text-xs text-gray-500">Válida até {formatarData(procuracao.expiraEm)}</p>
      )}
    </div>
  );
}

function FormularioCertificadoFiscal({ empresaId, aoConcluir }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting }, setError, clearErrors } = useForm();
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState(null);
  const arquivoWatch = watch('arquivo');
  const senhaWatch = watch('senha');
  const assinaturaAtual = `${arquivoWatch?.[0]?.name ?? ''}|${arquivoWatch?.[0]?.size ?? ''}|${senhaWatch ?? ''}`;
  const testeAtual = resultadoTeste?.assinaturaTestada === assinaturaAtual ? resultadoTeste : null;
  const testeValidoPraAtual = testeAtual?.ok && !testeAtual.cnpjDivergente;

  async function aoTestar() {
    const arquivo = arquivoWatch?.[0];
    const senha = senhaWatch;
    if (!arquivo) {
      setError('arquivo', { message: 'Selecione o arquivo do seu certificado' });
      return;
    }
    if (!senha) {
      setError('senha', { message: 'Obrigatório' });
      return;
    }
    clearErrors(['arquivo', 'senha']);
    setTestando(true);
    setResultadoTeste(null);
    try {
      const resultado = await testarCertificado(empresaId, { arquivo, tipo: 'A1', senha });
      setResultadoTeste({ ok: true, ...resultado, assinaturaTestada: assinaturaAtual });
    } catch (erro) {
      setResultadoTeste({ ok: false, mensagem: erro.message ?? 'Não conseguimos validar seu certificado agora' });
    } finally {
      setTestando(false);
    }
  }

  async function aoSubmeter(dados) {
    const arquivo = dados.arquivo?.[0];
    if (!arquivo || !testeValidoPraAtual) return;
    try {
      await cadastrarOuRotacionarCertificado(empresaId, { arquivo, tipo: 'A1', senha: dados.senha });
      aoConcluir();
    } catch (erro) {
      setError('root', { message: erro.message ?? 'Não conseguimos enviar seu certificado agora. Tente novamente.' });
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="mt-3 space-y-3">
      <p className="text-xs text-gray-500">Seu certificado é protegido e cifrado assim que enviado — ninguém, nem nós, consegue vê-lo depois.</p>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Arquivo do certificado (.pfx ou .p12)</label>
        <input type="file" accept=".pfx,.p12" {...register('arquivo')} className="w-full text-sm" />
        {errors.arquivo && <p className="mt-1 text-xs text-red-600">{errors.arquivo.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Senha do certificado</label>
        <input
          type="password"
          {...register('senha', { required: 'Obrigatório' })}
          className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {errors.senha && <p className="mt-1 text-xs text-red-600">{errors.senha.message}</p>}
      </div>

      <div>
        <button
          type="button"
          onClick={aoTestar}
          disabled={testando}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {testando ? 'Testando...' : 'Testar certificado'}
        </button>
        {testeAtual?.ok && testeAtual.cnpjDivergente && (
          <p className="mt-2 text-sm font-medium text-red-600">
            ⚠️ O CNPJ deste certificado ({testeAtual.cnpjCertificado}) não é o CNPJ da sua empresa -- confira se enviou o certificado
            correto.
          </p>
        )}
        {testeAtual?.ok && !testeAtual.cnpjDivergente && (
          <p className="mt-2 text-sm text-green-700">✅ Certificado válido — válido até {formatarData(testeAtual.validadeFim)}</p>
        )}
        {resultadoTeste?.ok === false && <p className="mt-2 text-sm text-red-600">❌ {resultadoTeste.mensagem}</p>}
        {resultadoTeste?.ok && !testeAtual && (
          <p className="mt-2 text-xs text-amber-600">Arquivo ou senha mudaram -- teste novamente antes de enviar.</p>
        )}
      </div>

      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <button
        type="submit"
        disabled={isSubmitting || !testeValidoPraAtual}
        title={!testeValidoPraAtual ? 'Teste o certificado antes de enviar' : undefined}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar certificado'}
      </button>
    </form>
  );
}

function CardCertificado({ empresaId }) {
  const [certificados, setCertificados] = useState(null);
  const [erro, setErro] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  async function carregar() {
    try {
      const dados = await listarCertificados(empresaId);
      setCertificados(dados);
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  if (erro) return <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">Não conseguimos verificar seu certificado agora.</p>;
  if (!certificados) return <p className="text-sm text-gray-500">Verificando...</p>;

  const ativo = certificados.find((c) => c.status === 'ativo');

  if (ativo) {
    const expiracao = statusExpiracaoCertificado(ativo.validadeFim);
    const diasRestantes = diasRestantesCertificado(ativo.validadeFim);

    if (expiracao === 'vencido') {
      return (
        <div>
          <p className="text-base font-medium text-gray-900">🔴 Seu certificado venceu</p>
          <p className="mt-1 text-sm text-gray-600">
            Venceu em {formatarData(ativo.validadeFim)} — suas consultas fiscais ficam bloqueadas até enviar um novo certificado. Fale
            com seu contador se precisar de ajuda.
          </p>
        </div>
      );
    }
    if (expiracao === 'proximo') {
      return (
        <div>
          <p className="text-base font-medium text-gray-900">🟠 Seu certificado vence em breve</p>
          <p className="mt-1 text-sm text-gray-600">
            Vence em {diasRestantes} dia{diasRestantes === 1 ? '' : 's'} ({formatarData(ativo.validadeFim)}) — providencie a renovação
            com seu contador antes do vencimento.
          </p>
        </div>
      );
    }
    return (
      <p className="text-base font-medium text-gray-900">
        🟢 Certificado ativo — válido até {formatarData(ativo.validadeFim)}
      </p>
    );
  }

  return (
    <div>
      <p className="text-base font-medium text-gray-900">🟡 Aguardando seu certificado digital</p>
      <p className="mt-1 text-sm text-gray-600">Envie o certificado da sua empresa para liberarmos as consultas fiscais.</p>
      {!mostrarForm ? (
        <button
          onClick={() => setMostrarForm(true)}
          className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Enviar certificado
        </button>
      ) : (
        <FormularioCertificadoFiscal empresaId={empresaId} aoConcluir={carregar} />
      )}
    </div>
  );
}

function ModalMensagemFiscal({ empresaId, mensagem, aoFechar, aoMarcarLida }) {
  const [conteudo, setConteudo] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let cancelado = false;
    obterDetalheMensagem(empresaId, mensagem.id)
      .then(async (resposta) => {
        if (cancelado) return;
        setConteudo(resposta.conteudo);
        if (mensagem.status === 'nao_lida') {
          await marcarMensagemComoLida(empresaId, mensagem.id);
          aoMarcarLida(mensagem.id);
        }
      })
      .catch((e) => !cancelado && setErro(e.message));
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagem.id]);

  const conteudoSeguro = conteudo ? DOMPurify.sanitize(conteudo) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500">{mensagem.orgao}</p>
            <h3 className="text-base font-semibold text-gray-900">{mensagem.assunto}</h3>
          </div>
          <button onClick={aoFechar} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
            ✕
          </button>
        </div>
        {erro && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
        {conteudoSeguro && (
          <div className="space-y-2 text-sm leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: conteudoSeguro }} />
        )}
      </div>
    </div>
  );
}

function CardCaixaPostal({ empresaId }) {
  const [mensagens, setMensagens] = useState(null);
  const [erro, setErro] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [mensagemAberta, setMensagemAberta] = useState(null);

  async function carregar() {
    try {
      const dados = await listarMensagensCaixaPostal(empresaId);
      setMensagens(dados);
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  async function aoSincronizar() {
    setSincronizando(true);
    try {
      await sincronizarCaixaPostal(empresaId);
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSincronizando(false);
    }
  }

  function aoMarcarLidaLocal(id) {
    setMensagens((atual) => atual.map((m) => (m.id === id ? { ...m, status: 'lida' } : m)));
  }

  if (erro) return <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">Não conseguimos verificar sua caixa postal agora.</p>;
  if (!mensagens) return <p className="text-sm text-gray-500">Verificando...</p>;

  const naoLidas = mensagens.filter((m) => m.status === 'nao_lida').length;
  const recentes = mensagens.slice(0, 5);

  return (
    <div>
      {naoLidas > 0 ? (
        <p className="text-base font-medium text-gray-900">
          🔔 Você tem {naoLidas} mensagem{naoLidas > 1 ? 's' : ''} nova{naoLidas > 1 ? 's' : ''} da Receita Federal
        </p>
      ) : (
        <p className="text-base font-medium text-gray-900">🟢 Nenhuma mensagem pendente</p>
      )}

      <button
        onClick={aoSincronizar}
        disabled={sincronizando}
        className="mt-2 text-sm font-medium text-blue-700 hover:underline disabled:opacity-50"
      >
        {sincronizando ? 'Verificando...' : 'Verificar novas mensagens'}
      </button>

      {recentes.length > 0 && (
        <ul className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
          {recentes.map((mensagem) => (
            <li key={mensagem.id}>
              <button onClick={() => setMensagemAberta(mensagem)} className="w-full py-2 text-left hover:bg-gray-50">
                <p className={`text-sm ${mensagem.status === 'nao_lida' ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  {mensagem.status === 'nao_lida' && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-blue-600 align-middle" />}
                  {mensagem.assunto}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {mensagemAberta && (
        <ModalMensagemFiscal
          empresaId={empresaId}
          mensagem={mensagemAberta}
          aoFechar={() => setMensagemAberta(null)}
          aoMarcarLida={aoMarcarLidaLocal}
        />
      )}
    </div>
  );
}

/**
 * CNPJ é sempre read-only aqui (mesma regra do backend -- `AtualizarEmpresaDto` nem tem
 * esse campo) -- é o identificador legal da empresa junto à Receita, nunca editável por
 * ninguém depois do cadastro (mesmo critério já aplicado nas telas de admin/contador).
 */
function CardDadosCadastrais({ empresa, aoAtualizar }) {
  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitting }, setError } = useForm({
    defaultValues: {
      razaoSocial: empresa.razaoSocial,
      nomeFantasia: empresa.nomeFantasia ?? '',
      regimeTributario: empresa.regimeTributario ?? '',
    },
  });
  const [mensagemSalvo, setMensagemSalvo] = useState(null);

  async function aoSubmeter(dados) {
    setMensagemSalvo(null);
    try {
      await atualizarEmpresa(empresa.id, {
        razaoSocial: dados.razaoSocial,
        nomeFantasia: dados.nomeFantasia || null,
        regimeTributario: dados.regimeTributario || null,
      });
      reset(dados); // volta isDirty pra false com o que acabou de ser salvo
      setMensagemSalvo('Dados salvos.');
      aoAtualizar();
    } catch (erro) {
      setError('root', { message: erro.message ?? 'Não conseguimos salvar seus dados agora' });
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Razão social</label>
        <input
          {...register('razaoSocial', { required: 'Obrigatório', minLength: { value: 2, message: 'Muito curto' } })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {errors.razaoSocial && <p className="mt-1 text-xs text-red-600">{errors.razaoSocial.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Nome fantasia</label>
        <input {...register('nomeFantasia')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">CNPJ</label>
        <input
          value={formatarCnpj(empresa.cnpj)}
          disabled
          className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
        />
        <p className="mt-1 text-xs text-gray-400">O CNPJ não pode ser alterado -- é o identificador legal da empresa junto à Receita.</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Regime tributário</label>
        <select {...register('regimeTributario')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Selecione...</option>
          {REGIMES_TRIBUTARIOS.map((regime) => (
            <option key={regime.valor} value={regime.valor}>
              {regime.rotulo}
            </option>
          ))}
        </select>
      </div>
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
        </button>
        {mensagemSalvo && <span className="text-sm text-green-700">{mensagemSalvo}</span>}
      </div>
    </form>
  );
}

export default function Fiscal() {
  const { usuario } = useSelector((state) => state.autenticacao);
  const [empresa, setEmpresa] = useState(null);
  const [erro, setErro] = useState(null);

  async function carregar() {
    try {
      const dados = await api.get(`/empresas/${usuario.empresaId}`);
      setEmpresa(dados);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    }
  }

  useEffect(() => {
    if (usuario?.empresaId) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  return (
    <LayoutPrincipal>
      {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">Erro ao carregar: {erro}</p>}

      {empresa && (
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-500">Sua empresa</p>
            <p className="mb-2 text-xl font-semibold text-gray-900">{empresa.razaoSocial}</p>
            <p className={`text-lg font-medium ${empresa.bloqueado ? 'text-red-600' : 'text-green-600'}`}>
              {empresa.bloqueado ? '🔴 Bloqueada' : '🟢 Regular'}
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">Dados cadastrais</h2>
            <CardDadosCadastrais empresa={empresa} aoAtualizar={carregar} />
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">Acesso à Receita Federal</h2>
            {empresa.modoAcessoSerpro === 'procuracao' ? (
              <CardProcuracao empresaId={empresa.id} />
            ) : (
              <CardCertificado empresaId={empresa.id} />
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">Caixa Postal</h2>
            <CardCaixaPostal empresaId={empresa.id} />
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">Minha assinatura</h2>
            <CardMinhaAssinatura empresaId={empresa.id} />
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">Comprar créditos</h2>
            <CardComprarCreditosAvulsos empresaId={empresa.id} permitirRevenda />
          </div>
        </div>
      )}
    </LayoutPrincipal>
  );
}
