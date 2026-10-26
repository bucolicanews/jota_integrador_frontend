import { useEffect, useState } from 'react';
import { iniciarMinhaAssinatura, listarMeusPlanosRevendaCreditos, obterMeuPagamentoPendente, obterMinhaAssinatura } from '../../servicos/assinatura';
import FormularioCheckoutPagbank from '../pagbank/FormularioCheckoutPagbank';

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
const formatarData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : null);

const ROTULO_STATUS = {
  ativa: { texto: 'Ativa', cor: 'text-green-700 bg-green-50' },
  bloqueada: { texto: 'Bloqueada', cor: 'text-red-700 bg-red-50' },
  cancelada: { texto: 'Cancelada', cor: 'text-gray-700 bg-gray-100' },
};

/**
 * Assinatura de créditos SERPRO -- a empresa vê o status atual e, se quiser assinar ou
 * trocar de plano, escolhe direto do catálogo de revenda do PRÓPRIO contador (self-service,
 * sem precisar que ele inicie a cobrança). Mesmo padrão de PIX de CardComprarCreditosAvulsos.
 */
export default function CardMinhaAssinatura({ empresaId }) {
  const [assinatura, setAssinatura] = useState(undefined); // undefined = carregando, null = nenhuma
  const [planos, setPlanos] = useState(null);
  const [erro, setErro] = useState(null);
  const [planoSelecionado, setPlanoSelecionado] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [resultadoPix, setResultadoPix] = useState(null);
  const [pagamentoPendente, setPagamentoPendente] = useState(undefined); // undefined = carregando, null = nenhum

  function carregar() {
    Promise.all([obterMinhaAssinatura(empresaId), listarMeusPlanosRevendaCreditos(empresaId), obterMeuPagamentoPendente(empresaId)])
      .then(([dadosAssinatura, listaPlanos, pendente]) => {
        setAssinatura(dadosAssinatura);
        setPlanos(listaPlanos);
        setPagamentoPendente(pendente);
      })
      .catch((e) => setErro(e.message));
  }
  useEffect(carregar, [empresaId]);

  async function aoAssinar(dados) {
    setProcessando(true);
    try {
      const resultado = await iniciarMinhaAssinatura(empresaId, {
        planoId: planoSelecionado.planoId,
        metodo: dados.metodo,
        cardEncrypted: dados.cardEncrypted,
        installments: dados.installments,
        customerEmail: dados.customerEmail,
      });
      setResultadoPix(resultado);
    } catch (e) {
      setErro(e.message);
    } finally {
      setProcessando(false);
    }
  }

  if (erro) return <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>;
  if (assinatura === undefined || planos === null || pagamentoPendente === undefined) {
    return <p className="text-sm text-gray-500">Carregando...</p>;
  }

  const badge = assinatura ? ROTULO_STATUS[assinatura.status] ?? { texto: assinatura.status, cor: 'text-gray-700 bg-gray-100' } : null;
  const planoAtual = assinatura ? planos.find((p) => p.planoRevendaId === assinatura.planoRevendaId) : null;
  const validade = formatarData(assinatura?.fimEm);

  return (
    <div className="space-y-3">
      {assinatura ? (
        <div className="rounded-md bg-gray-50 p-3">
          <p className="text-sm text-gray-600">
            Status:{' '}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cor}`}>{badge.texto}</span>
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">Plano: {planoAtual?.nome ?? '—'}</p>
          {validade && <p className="text-xs text-gray-500">Válida até {validade}</p>}
        </div>
      ) : (
        <p className="text-sm text-gray-600">Nenhuma assinatura ainda.</p>
      )}

      {/* Já existe uma cobrança gerada (por ela mesma ou pelo contador na criação da
          empresa, "cliente paga depois") -- mostra pra pagar/continuar, nunca deixa
          escolher outro plano em paralelo (o backend só permite 1 pendente por empresa). */}
      {pagamentoPendente && (
        <FormularioCheckoutPagbank resultado={pagamentoPendente} onConfirmar={() => {}} onCancelar={() => {}} />
      )}

      {!pagamentoPendente && (
        planos.length === 0 ? (
          <p className="text-sm text-gray-500">Seu contador ainda não cadastrou nenhum plano de revenda pra você assinar por conta própria -- fale com ele.</p>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {assinatura ? 'Renovar ou trocar de plano' : 'Assinar'} (vendido pelo seu contador)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {planos.map((p) => {
                const ehAtual = p.planoRevendaId === assinatura?.planoRevendaId;
                return (
                  <button
                    key={p.planoRevendaId}
                    onClick={() => {
                      setPlanoSelecionado(p);
                      setResultadoPix(null);
                    }}
                    className={`rounded-md border p-3 text-left ${planoSelecionado?.planoRevendaId === p.planoRevendaId ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                      {p.nome}
                      {ehAtual && <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">Atual</span>}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatarMoeda(p.valorVenda)} / {p.periodicidade === 'mensal' ? 'mês' : p.periodicidade === 'anual' ? 'ano' : p.periodicidade}
                    </p>
                  </button>
                );
              })}
            </div>
          </>
        )
      )}

      {!pagamentoPendente && planoSelecionado && (
        <FormularioCheckoutPagbank
          enviando={processando}
          resultado={resultadoPix}
          onCancelar={() => setPlanoSelecionado(null)}
          onConfirmar={aoAssinar}
          rotuloConfirmarPix="Gerar PIX"
          rotuloConfirmarCartao="Assinar com cartão"
        />
      )}
    </div>
  );
}
