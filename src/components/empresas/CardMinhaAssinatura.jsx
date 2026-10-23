import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { iniciarMinhaAssinatura, listarMeusPlanosRevendaCreditos, obterMinhaAssinatura } from '../../servicos/assinatura';

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
const formatarData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : null);

const ROTULO_STATUS = {
  ativa: { texto: 'Ativa', cor: 'text-green-700 bg-green-50' },
  bloqueada: { texto: 'Bloqueada', cor: 'text-red-700 bg-red-50' },
  cancelada: { texto: 'Cancelada', cor: 'text-gray-700 bg-gray-100' },
};

function FormularioAssinar({ onConfirmar, onCancelar, enviando }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { customerEmail: '' } });

  return (
    <form onSubmit={handleSubmit(onConfirmar)} className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-700">E-mail pra receber o PIX</label>
        <input
          type="email"
          {...register('customerEmail', { required: true })}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        {errors.customerEmail && <p className="text-xs text-red-600">Obrigatório</p>}
      </div>
      <button type="submit" disabled={enviando} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {enviando ? 'Gerando PIX...' : 'Gerar PIX'}
      </button>
      <button type="button" onClick={onCancelar} className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100">
        Cancelar
      </button>
    </form>
  );
}

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

  function carregar() {
    Promise.all([obterMinhaAssinatura(empresaId), listarMeusPlanosRevendaCreditos(empresaId)])
      .then(([dadosAssinatura, listaPlanos]) => {
        setAssinatura(dadosAssinatura);
        setPlanos(listaPlanos);
      })
      .catch((e) => setErro(e.message));
  }
  useEffect(carregar, [empresaId]);

  async function aoAssinar(dados) {
    setProcessando(true);
    try {
      const resultado = await iniciarMinhaAssinatura(empresaId, { planoId: planoSelecionado.planoId, metodo: 'pix', customerEmail: dados.customerEmail });
      setResultadoPix(resultado);
    } catch (e) {
      setErro(e.message);
    } finally {
      setProcessando(false);
    }
  }

  if (erro) return <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>;
  if (assinatura === undefined || planos === null) return <p className="text-sm text-gray-500">Carregando...</p>;

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

      {planos.length === 0 ? (
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
      )}

      {planoSelecionado && !resultadoPix && (
        <FormularioAssinar enviando={processando} onCancelar={() => setPlanoSelecionado(null)} onConfirmar={aoAssinar} />
      )}

      {resultadoPix && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-center">
          <p className="mb-2 text-xs font-medium text-blue-800">PIX gerado -- pague pra ativar a assinatura:</p>
          {resultadoPix.pixQrUrl && <img src={resultadoPix.pixQrUrl} alt="QR Code PIX" className="mx-auto mb-2 h-32 w-32" />}
          {resultadoPix.pixCode && (
            <textarea
              readOnly
              value={resultadoPix.pixCode}
              onClick={(e) => e.target.select()}
              className="w-full rounded-md border border-gray-300 bg-white p-2 text-xs"
              rows={3}
            />
          )}
          <p className="mt-2 text-xs text-blue-700">A assinatura é ativada automaticamente assim que o pagamento for confirmado.</p>
        </div>
      )}
    </div>
  );
}
