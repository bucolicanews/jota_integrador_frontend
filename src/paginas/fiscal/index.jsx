import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import DOMPurify from 'dompurify';
import LayoutPrincipal from '../../components/layout/LayoutPrincipal';
import { api } from '../../servicos/api';
import { atualizarEmpresa } from '../../servicos/empresas';
import CardComprarCreditosAvulsos from '../../components/empresas/CardComprarCreditosAvulsos';
import CardContaPagbankEmpresa from '../../components/empresas/CardContaPagbankEmpresa';
import SecaoCertificadoSerpro from '../../components/empresas/SecaoCertificadoSerpro';
import SecaoProcuracaoSerpro from '../../components/empresas/SecaoProcuracaoSerpro';
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
import { notificarSaldoCreditosAtualizado } from '../../servicos/creditos';

/**
 * Perfil JOTA FISCAL (empresário) -- linguagem 100% não-técnica, semáforo 🟢🟡🔴 como
 * padrão visual consistente (docs/UX-UI.md). Roda dentro do mesmo LayoutPrincipal/
 * MenuLateral do JOTA CONTÁBIL (empresa ganha sidebar com os módulos que o contador
 * licenciou pra ela) -- só o conteúdo desta página é o dashboard enxuto original.
 */

function ModalMensagemFiscal({ empresaId, mensagem, aoFechar, aoMarcarLida }) {
  const [conteudo, setConteudo] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let cancelado = false;
    obterDetalheMensagem(empresaId, mensagem.id)
      .then(async (resposta) => {
        if (cancelado) return;
        notificarSaldoCreditosAtualizado();
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
      notificarSaldoCreditosAtualizado();
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

  if (erro) return <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro || 'Não conseguimos verificar sua caixa postal agora.'}</p>;
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

const ABAS_FISCAL = [
  { id: 'dados', rotulo: 'Dados cadastrais' },
  { id: 'acesso-serpro', rotulo: 'Acesso à Receita Federal' },
  { id: 'caixa-postal', rotulo: 'Caixa Postal' },
  { id: 'creditos', rotulo: 'Comprar créditos' },
  { id: 'pagbank', rotulo: 'Conta PagBank' },
];

export default function Fiscal() {
  const navegar = useNavigate();
  const { usuario } = useSelector((state) => state.autenticacao);
  const [empresa, setEmpresa] = useState(null);
  const [erro, setErro] = useState(null);
  const [semPlanoAtivo, setSemPlanoAtivo] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('dados');

  async function carregar() {
    try {
      const dados = await api.get(`/empresas/${usuario.empresaId}`);
      setEmpresa(dados);
      setSemPlanoAtivo(false);
    } catch (erroRequisicao) {
      if (erroRequisicao.message?.includes('sem plano ativo')) {
        setSemPlanoAtivo(true);
      } else {
        setErro(erroRequisicao.message);
      }
    }
  }

  useEffect(() => {
    if (usuario?.empresaId) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  if (semPlanoAtivo) {
    return (
      <LayoutPrincipal>
        <div className="mx-auto max-w-md rounded-lg bg-white p-8 text-center shadow">
          <p className="mb-2 text-4xl">🔒</p>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Sua empresa está sem plano ativo</h2>
          <p className="mb-6 text-sm text-gray-500">
            Pra voltar a acessar o sistema, ative um plano agora ou peça pro seu contador liberar o acesso.
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navegar('/minha-assinatura')}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Ver minha assinatura
            </button>
            <p className="text-xs text-gray-400">Ou fale com seu contador pra liberar o acesso.</p>
          </div>
        </div>
      </LayoutPrincipal>
    );
  }

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

          <div className="border-b border-gray-200">
            <div className="flex gap-1 overflow-x-auto">
              {ABAS_FISCAL.map((aba) => (
                <button
                  key={aba.id}
                  type="button"
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                    abaAtiva === aba.id
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {aba.rotulo}
                </button>
              ))}
            </div>
          </div>

          {abaAtiva === 'dados' && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">Dados cadastrais</h2>
              <CardDadosCadastrais empresa={empresa} aoAtualizar={carregar} />
            </div>
          )}

          {abaAtiva === 'acesso-serpro' && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">Acesso à Receita Federal</h2>
              {empresa.modoAcessoSerpro === 'procuracao' ? (
                <SecaoProcuracaoSerpro empresaId={empresa.id} podeEditar={false} />
              ) : (
                <SecaoCertificadoSerpro empresaId={empresa.id} />
              )}
            </div>
          )}

          {abaAtiva === 'caixa-postal' && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">Caixa Postal</h2>
              <CardCaixaPostal empresaId={empresa.id} />
            </div>
          )}

          {abaAtiva === 'creditos' && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">Comprar créditos</h2>
              <CardComprarCreditosAvulsos empresaId={empresa.id} permitirRevenda />
            </div>
          )}

          {abaAtiva === 'pagbank' && <CardContaPagbankEmpresa empresa={empresa} aoAtualizar={carregar} />}
        </div>
      )}
    </LayoutPrincipal>
  );
}
