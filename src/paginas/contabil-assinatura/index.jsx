import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CabecalhoContabil } from '../../componentes/contabil/CabecalhoContabil';
import {
  cancelarAssinatura,
  iniciarCheckout,
  listarFaturas,
  listarPlanos,
  obterAssinaturaAtual,
} from '../../servicos/assinatura';

const STATUS_ASSINATURA = {
  ativa: { rotulo: 'Ativa', cor: 'bg-green-50 text-green-700', icone: '🟢' },
  inadimplente: { rotulo: 'Inadimplente', cor: 'bg-red-50 text-red-700', icone: '🔴' },
  cancelada: { rotulo: 'Cancelada', cor: 'bg-gray-100 text-gray-600', icone: '⚪' },
};

const STATUS_FATURA = {
  pendente: { rotulo: 'Pendente', cor: 'bg-amber-50 text-amber-700', icone: '🟡' },
  paga: { rotulo: 'Paga', cor: 'bg-green-50 text-green-700', icone: '🟢' },
  atrasada: { rotulo: 'Atrasada', cor: 'bg-red-50 text-red-700', icone: '🔴' },
  cancelada: { rotulo: 'Cancelada', cor: 'bg-gray-100 text-gray-600', icone: '⚪' },
};

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
const formatarData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

function CardPlano({ plano, aoAssinar, assinando }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">{plano.nome}</h3>
      <p className="mt-1 text-2xl font-bold text-gray-900">
        {formatarMoeda(plano.preco)}
        <span className="text-sm font-normal text-gray-500">/{plano.periodicidade === 'anual' ? 'ano' : 'mês'}</span>
      </p>
      <p className="mt-2 text-sm text-gray-600">{plano.operacoesIncluidas} operações fiscais incluídas</p>
      <button
        onClick={() => aoAssinar(plano.id)}
        disabled={assinando}
        className="mt-4 w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {assinando ? 'Redirecionando...' : 'Assinar este plano'}
      </button>
    </div>
  );
}

export default function ContabilAssinatura() {
  const { usuario } = useSelector((state) => state.autenticacao);
  const [searchParams] = useSearchParams();
  const [assinatura, setAssinatura] = useState(null);
  const [planos, setPlanos] = useState([]);
  const [faturas, setFaturas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [assinandoPlanoId, setAssinandoPlanoId] = useState(null);
  const [cancelando, setCancelando] = useState(false);

  const contadorId = usuario?.contadorId;
  const checkoutStatus = searchParams.get('checkout');

  async function carregar() {
    setCarregando(true);
    try {
      const [dadosAssinatura, dadosPlanos, dadosFaturas] = await Promise.all([
        obterAssinaturaAtual(contadorId),
        listarPlanos(),
        listarFaturas(contadorId),
      ]);
      setAssinatura(dadosAssinatura);
      setPlanos(dadosPlanos);
      setFaturas(dadosFaturas);
      setErro(null);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (contadorId) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contadorId]);

  async function aoAssinar(planoId) {
    setAssinandoPlanoId(planoId);
    setErro(null);
    try {
      const origem = window.location.origin;
      const { url } = await iniciarCheckout(contadorId, {
        planoId,
        successUrl: `${origem}/contabil/assinatura?checkout=sucesso`,
        cancelUrl: `${origem}/contabil/assinatura?checkout=cancelado`,
      });
      window.location.href = url;
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
      setAssinandoPlanoId(null);
    }
  }

  async function aoCancelar() {
    if (!window.confirm('Cancelar a renovação automática? O acesso continua até o fim do período já pago.')) return;
    setCancelando(true);
    try {
      await cancelarAssinatura(contadorId);
      await carregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setCancelando(false);
    }
  }

  const planoAtual = assinatura ? planos.find((p) => p.id === assinatura.planoId) : null;
  const statusInfo = assinatura ? STATUS_ASSINATURA[assinatura.status] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <CabecalhoContabil />

      <main className="mx-auto max-w-4xl px-6 py-6">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">Assinatura & Faturas</h1>

        {checkoutStatus === 'sucesso' && (
          <p className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
            Pagamento em processamento — pode levar alguns instantes até a assinatura ser confirmada aqui.
          </p>
        )}
        {checkoutStatus === 'cancelado' && (
          <p className="mb-4 rounded-md bg-gray-100 p-3 text-sm text-gray-600">Checkout cancelado.</p>
        )}
        {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        {carregando ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : assinatura ? (
          <div className="mb-8 rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Plano atual</h2>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.cor}`}>
                {statusInfo.icone} {statusInfo.rotulo}
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{planoAtual?.nome ?? 'Plano'}</p>
            {planoAtual && (
              <p className="text-sm text-gray-600">
                {formatarMoeda(planoAtual.preco)}/{planoAtual.periodicidade === 'anual' ? 'ano' : 'mês'} ·{' '}
                {planoAtual.operacoesIncluidas} operações incluídas
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              {assinatura.renovacaoAutomatica ? 'Renovação automática ativada' : 'Renovação automática cancelada — o acesso termina no fim do período já pago'}
            </p>

            {assinatura.status === 'ativa' && assinatura.renovacaoAutomatica && (
              <button
                onClick={aoCancelar}
                disabled={cancelando}
                className="mt-4 rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {cancelando ? 'Cancelando...' : 'Cancelar renovação'}
              </button>
            )}
          </div>
        ) : (
          <div className="mb-8">
            <p className="mb-4 text-sm text-gray-600">Nenhuma assinatura ativa ainda. Escolha um plano para começar:</p>
            {planos.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum plano disponível no momento.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {planos.map((plano) => (
                  <CardPlano key={plano.id} plano={plano} aoAssinar={aoAssinar} assinando={assinandoPlanoId === plano.id} />
                ))}
              </div>
            )}
          </div>
        )}

        {!carregando && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Faturas</h2>
            {faturas.length === 0 ? (
              <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">Nenhuma fatura ainda.</p>
            ) : (
              <div className="overflow-hidden rounded-lg bg-white shadow">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Competência</th>
                      <th className="px-4 py-3">Vencimento</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {faturas.map((fatura) => {
                      const info = STATUS_FATURA[fatura.status];
                      return (
                        <tr key={fatura.id}>
                          <td className="px-4 py-3 text-gray-600">{formatarData(fatura.competencia)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatarData(fatura.vencimento)}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{formatarMoeda(fatura.valor)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${info.cor}`}>
                              {info.icone} {info.rotulo}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
