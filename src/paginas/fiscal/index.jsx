import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import DOMPurify from 'dompurify';
import { api } from '../../servicos/api';
import { supabase } from '../../servicos/supabase';
import { limparUsuario } from '../../store/autenticacaoSlice';
import { cadastrarOuRotacionarCertificado, listarCertificados, obterProcuracao } from '../../servicos/acessoSerpro';
import {
  listarMensagensCaixaPostal,
  marcarMensagemComoLida,
  obterDetalheMensagem,
  sincronizarCaixaPostal,
} from '../../servicos/caixaPostal';

const formatarData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

/**
 * Perfil JOTA FISCAL (empresário) -- diferente do JOTA CONTÁBIL: linguagem 100%
 * não-técnica, um dashboard único (sem navegação densa entre telas), semáforo
 * 🟢🟡🔴 como padrão visual consistente (docs/UX-UI.md).
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
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm({
    defaultValues: { validadeFim: '' },
  });

  async function aoSubmeter(dados) {
    const arquivo = dados.arquivo?.[0];
    if (!arquivo) {
      setError('arquivo', { message: 'Selecione o arquivo do seu certificado' });
      return;
    }
    try {
      await cadastrarOuRotacionarCertificado(empresaId, {
        arquivo,
        tipo: 'A1',
        senha: dados.senha,
        validadeFim: dados.validadeFim,
      });
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
        <label className="mb-1 block text-sm font-medium text-gray-700">Validade do certificado</label>
        <input
          type="date"
          {...register('validadeFim', { required: 'Obrigatório' })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {errors.validadeFim && <p className="mt-1 text-xs text-red-600">{errors.validadeFim.message}</p>}
      </div>
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
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

export default function Fiscal() {
  const dispatch = useDispatch();
  const { usuario } = useSelector((state) => state.autenticacao);
  const [empresa, setEmpresa] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    async function carregar() {
      try {
        const dados = await api.get(`/empresas/${usuario.empresaId}`);
        setEmpresa(dados);
      } catch (erroRequisicao) {
        setErro(erroRequisicao.message);
      }
    }
    if (usuario?.empresaId) carregar();
  }, [usuario]);

  async function sair() {
    await supabase.auth.signOut();
    dispatch(limparUsuario());
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">JOTA FISCAL</h1>
        <button onClick={sair} className="text-sm text-gray-500 hover:text-gray-700">
          Sair
        </button>
      </header>

      {erro && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">Erro ao carregar: {erro}</p>}

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
        </div>
      )}
    </div>
  );
}
