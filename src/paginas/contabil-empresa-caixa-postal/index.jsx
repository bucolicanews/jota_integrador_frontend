import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { CabecalhoContabil } from '../../componentes/contabil/CabecalhoContabil';
import { obterEmpresa } from '../../servicos/empresas';
import {
  listarMensagensCaixaPostal,
  marcarMensagemComoLida,
  obterDetalheMensagem,
  sincronizarCaixaPostal,
} from '../../servicos/caixaPostal';

const formatarData = (iso) => new Date(iso).toLocaleDateString('pt-BR');

function ModalMensagem({ empresaId, mensagem, aoFechar, aoMarcarLida }) {
  const [conteudo, setConteudo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const resposta = await obterDetalheMensagem(empresaId, mensagem.id);
        if (cancelado) return;
        setConteudo(resposta.conteudo);
        if (mensagem.status === 'nao_lida') {
          await marcarMensagemComoLida(empresaId, mensagem.id);
          aoMarcarLida(mensagem.id);
        }
      } catch (erroRequisicao) {
        if (!cancelado) setErro(erroRequisicao.message);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    carregar();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensagem.id]);

  const conteudoSeguro = conteudo ? DOMPurify.sanitize(conteudo) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">{mensagem.orgao}</p>
            <h2 className="text-lg font-semibold text-gray-900">{mensagem.assunto}</h2>
            <p className="text-xs text-gray-500">{formatarData(mensagem.dataRecebimento)}</p>
          </div>
          <button onClick={aoFechar} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
            ✕
          </button>
        </div>

        {carregando && <p className="text-sm text-gray-500">Carregando conteúdo...</p>}
        {erro && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
        {conteudoSeguro && (
          // Conteúdo vem do SERPRO (Receita Federal), sempre sanitizado com DOMPurify
          // antes de renderizar -- nunca HTML bruto direto no DOM (docs/SEGURANCA.md).
          <div className="space-y-2 text-sm leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: conteudoSeguro }} />
        )}
      </div>
    </div>
  );
}

export default function ContabilEmpresaCaixaPostal() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [empresa, setEmpresa] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [erro, setErro] = useState(null);
  const [mensagemSelecionada, setMensagemSelecionada] = useState(null);
  const [avisoSincronizacao, setAvisoSincronizacao] = useState(null);

  async function carregar() {
    setCarregando(true);
    try {
      const [dadosEmpresa, dadosMensagens] = await Promise.all([obterEmpresa(id), listarMensagensCaixaPostal(id)]);
      setEmpresa(dadosEmpresa);
      setMensagens(dadosMensagens);
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
  }, [id]);

  async function aoSincronizar() {
    setSincronizando(true);
    setAvisoSincronizacao(null);
    try {
      const { sincronizadas } = await sincronizarCaixaPostal(id);
      setAvisoSincronizacao(
        sincronizadas > 0 ? `${sincronizadas} mensagem${sincronizadas > 1 ? 's' : ''} nova${sincronizadas > 1 ? 's' : ''}.` : 'Nenhuma mensagem nova.',
      );
      const dadosMensagens = await listarMensagensCaixaPostal(id);
      setMensagens(dadosMensagens);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setSincronizando(false);
    }
  }

  function aoMarcarLidaLocal(mensagemId) {
    setMensagens((atual) => atual.map((m) => (m.id === mensagemId ? { ...m, status: 'lida' } : m)));
  }

  const naoLidas = mensagens.filter((m) => m.status === 'nao_lida').length;

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

        {empresa && (
          <>
            <h1 className="mb-1 text-xl font-semibold text-gray-900">{empresa.razaoSocial}</h1>
            <p className="mb-6 text-sm text-gray-500">Caixa Postal — Receita Federal</p>
          </>
        )}

        {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {mensagens.length} {mensagens.length === 1 ? 'mensagem' : 'mensagens'}
            {naoLidas > 0 && <span className="ml-1 font-medium text-blue-700">· {naoLidas} não lida{naoLidas > 1 ? 's' : ''}</span>}
          </p>
          <button
            onClick={aoSincronizar}
            disabled={sincronizando}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {sincronizando ? 'Sincronizando...' : 'Sincronizar com a Receita Federal'}
          </button>
        </div>

        {avisoSincronizacao && <p className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">{avisoSincronizacao}</p>}

        {carregando ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : mensagens.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">
            Nenhuma mensagem ainda. Sincronize para verificar a caixa postal.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg bg-white shadow">
            {mensagens.map((mensagem) => (
              <li key={mensagem.id}>
                <button
                  onClick={() => setMensagemSelecionada(mensagem)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className={`truncate text-sm ${mensagem.status === 'nao_lida' ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {mensagem.status === 'nao_lida' && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-blue-600 align-middle" />}
                      {mensagem.assunto}
                    </p>
                    <p className="truncate text-xs text-gray-500">{mensagem.orgao}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs text-gray-400">{formatarData(mensagem.dataRecebimento)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {mensagemSelecionada && (
        <ModalMensagem
          empresaId={id}
          mensagem={mensagemSelecionada}
          aoFechar={() => setMensagemSelecionada(null)}
          aoMarcarLida={aoMarcarLidaLocal}
        />
      )}
    </div>
  );
}
