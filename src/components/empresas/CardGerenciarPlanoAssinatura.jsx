import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  atualizarVencimentoAssinatura,
  ativarAssinaturaManual,
  iniciarPagamentoAssinatura,
  listarPlanos,
  listarPlanosRevendaCreditos,
  obterAssinatura,
} from '../../servicos/assinatura';

const STATUS_ASSINATURA = {
  ativa: { rotulo: 'Ativa', cor: 'bg-green-50 text-green-700', icone: '🟢' },
  vencida: { rotulo: 'Vencida', cor: 'bg-red-50 text-red-700', icone: '🔴' },
  bloqueada: { rotulo: 'Bloqueada', cor: 'bg-amber-50 text-amber-700', icone: '🟡' },
  cancelada: { rotulo: 'Cancelada', cor: 'bg-gray-100 text-gray-600', icone: '⚪' },
};

const formatarData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
// yyyy-mm-dd pro <input type="date"> -- vencimento é sempre fim do dia, não interessa a hora aqui.
const paraInputData = (iso) => (iso ? iso.slice(0, 10) : '');

/** Formulário mínimo pra gerar o PIX -- e-mail é obrigatório (exigido pela PagBank). */
function FormularioFatura({ onConfirmar, onCancelar, enviando }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { customerEmail: '' } });

  return (
    <form onSubmit={handleSubmit(onConfirmar)} className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-700">E-mail do responsável (pra receber o PIX)</label>
        <input
          type="email"
          {...register('customerEmail', { required: true })}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        {errors.customerEmail && <p className="text-xs text-red-600">Obrigatório</p>}
      </div>
      <button type="submit" disabled={enviando} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {enviando ? 'Gerando...' : 'Gerar fatura (PIX)'}
      </button>
      <button type="button" onClick={onCancelar} className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100">
        Cancelar
      </button>
    </form>
  );
}

/**
 * Controle do contador sobre o plano de créditos SERPRO de UMA empresa da carteira --
 * embutido na tela de detalhe da empresa (contabil-empresa-detalhe), pra não precisar
 * navegar pra /contabil/assinatura. Mesmas chamadas de ContabilAssinatura, versão
 * compacta: trocar plano, editar vencimento manualmente, gerar fatura PIX pra enviar.
 */
export default function CardGerenciarPlanoAssinatura({ empresaId, contadorId }) {
  const [assinatura, setAssinatura] = useState(null);
  const [planos, setPlanos] = useState([]);
  const [planosRevenda, setPlanosRevenda] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [planoSelecionadoId, setPlanoSelecionadoId] = useState('');
  const [salvandoPlano, setSalvandoPlano] = useState(false);

  const [editandoVencimento, setEditandoVencimento] = useState(false);
  const [novoVencimento, setNovoVencimento] = useState('');
  const [salvandoVencimento, setSalvandoVencimento] = useState(false);

  const [mostrandoFatura, setMostrandoFatura] = useState(false);
  const [gerandoFatura, setGerandoFatura] = useState(false);
  const [resultadoFatura, setResultadoFatura] = useState(null);

  async function carregar() {
    setCarregando(true);
    try {
      const [dadosAssinatura, dadosPlanos, dadosPlanosRevenda] = await Promise.all([
        obterAssinatura(contadorId, empresaId),
        listarPlanos(),
        listarPlanosRevendaCreditos(contadorId).catch(() => []),
      ]);
      setAssinatura(dadosAssinatura);
      setPlanos(dadosPlanos);
      setPlanosRevenda(dadosPlanosRevenda);
      setPlanoSelecionadoId(dadosAssinatura?.planoId ?? '');
      setErro(null);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (contadorId && empresaId) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contadorId, empresaId]);

  async function aoSalvarPlano() {
    if (!planoSelecionadoId || planoSelecionadoId === assinatura?.planoId) return;
    setSalvandoPlano(true);
    setErro(null);
    try {
      const planoRevenda = planosRevenda.find((pr) => pr.planoId === planoSelecionadoId && pr.ativo);
      await ativarAssinaturaManual(contadorId, empresaId, { planoId: planoSelecionadoId, planoRevendaId: planoRevenda?.id ?? null });
      await carregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setSalvandoPlano(false);
    }
  }

  function aoAbrirEdicaoVencimento() {
    setNovoVencimento(paraInputData(assinatura?.fimEm));
    setEditandoVencimento(true);
  }

  async function aoSalvarVencimento() {
    setSalvandoVencimento(true);
    setErro(null);
    try {
      // Sem data = remove vencimento (assinatura não expira).
      const fimEm = novoVencimento ? new Date(`${novoVencimento}T23:59:59`).toISOString() : null;
      await atualizarVencimentoAssinatura(contadorId, empresaId, fimEm);
      setEditandoVencimento(false);
      await carregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setSalvandoVencimento(false);
    }
  }

  async function aoGerarFatura(dados) {
    setGerandoFatura(true);
    setErro(null);
    try {
      const planoId = assinatura?.planoId ?? planoSelecionadoId;
      const resultado = await iniciarPagamentoAssinatura(contadorId, empresaId, { planoId, metodo: 'pix', customerEmail: dados.customerEmail });
      setResultadoFatura(resultado);
      setMostrandoFatura(false);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setGerandoFatura(false);
    }
  }

  if (carregando) return <p className="text-sm text-gray-500">Carregando...</p>;

  const statusInfo = assinatura ? STATUS_ASSINATURA[assinatura.status] : null;
  const planoRevendaDoAtual = assinatura ? planosRevenda.find((pr) => pr.planoId === assinatura.planoId && pr.ativo) : null;

  return (
    <div>
      {erro && <p className="mb-3 rounded-md bg-red-50 p-2 text-xs text-red-700">{erro}</p>}

      {!assinatura ? (
        <p className="mb-3 text-sm text-gray-500">Empresa sem assinatura ainda -- escolha um plano abaixo pra ativar.</p>
      ) : (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.cor}`}>
            {statusInfo.icone} {statusInfo.rotulo}
          </span>
          <span className="text-sm text-gray-700">
            Plano: <strong>{assinatura.planoNome ?? '—'}</strong>
          </span>
          {!editandoVencimento ? (
            <span className="flex items-center gap-1.5 text-sm text-gray-700">
              Vencimento: <strong>{formatarData(assinatura.fimEm)}</strong>
              <button type="button" onClick={aoAbrirEdicaoVencimento} className="text-xs font-medium text-blue-700 hover:underline">
                editar
              </button>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <input
                type="date"
                value={novoVencimento}
                onChange={(e) => setNovoVencimento(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={aoSalvarVencimento}
                disabled={salvandoVencimento}
                className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {salvandoVencimento ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setEditandoVencimento(false)} className="text-xs text-gray-500 hover:underline">
                cancelar
              </button>
              {novoVencimento === '' && <span className="text-xs text-amber-600">vazio = sem vencimento</span>}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Trocar plano</label>
          <select
            value={planoSelecionadoId}
            onChange={(e) => setPlanoSelecionadoId(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">Selecione...</option>
            {planos.map((plano) => (
              <option key={plano.id} value={plano.id}>
                {plano.nome}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={aoSalvarPlano}
          disabled={salvandoPlano || !planoSelecionadoId || planoSelecionadoId === assinatura?.planoId}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {salvandoPlano ? 'Salvando...' : 'Ativar sem cobrar'}
        </button>
        {assinatura && (
          planoRevendaDoAtual ? (
            <button
              type="button"
              onClick={() => setMostrandoFatura(true)}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Gerar fatura (PIX)
            </button>
          ) : (
            <p className="text-xs text-gray-400">Cadastre seu preço de venda (Minhas Licenças) pra gerar fatura.</p>
          )
        )}
      </div>

      {mostrandoFatura && (
        <FormularioFatura enviando={gerandoFatura} onCancelar={() => setMostrandoFatura(false)} onConfirmar={aoGerarFatura} />
      )}

      {resultadoFatura && (
        <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-center">
          <p className="mb-2 text-xs font-medium text-blue-800">Fatura gerada -- envie pro cliente pagar:</p>
          {resultadoFatura.pixQrUrl && <img src={resultadoFatura.pixQrUrl} alt="QR Code PIX" className="mx-auto mb-2 h-32 w-32" />}
          {resultadoFatura.pixCode && (
            <textarea
              readOnly
              value={resultadoFatura.pixCode}
              onClick={(e) => e.target.select()}
              className="w-full rounded-md border border-gray-300 bg-white p-2 text-xs"
              rows={3}
            />
          )}
        </div>
      )}
    </div>
  );
}
