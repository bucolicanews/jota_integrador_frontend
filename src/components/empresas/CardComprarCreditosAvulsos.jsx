import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { comprarCreditoAvulso, listarPacotesCreditosAvulsos } from '../../servicos/creditosAvulsos';

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);

/** Formulário mínimo pra gerar o PIX -- só o e-mail é obrigatório (exigido pela PagBank), mesmo padrão de FormularioCobrarPix em contabil-assinatura/. */
function FormularioComprarCredito({ onConfirmar, onCancelar, enviando }) {
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
 * Top-up pontual de créditos SERPRO -- a empresa compra direto da plataforma (ou o
 * contador compra em nome dela), pra usar em consultas avulsas fora da cota incluída no
 * plano. Mesmo padrão de PIX de contabil-assinatura/, mas sem split: 100% pra Jota.
 * Usado tanto em paginas/fiscal (visão da empresa) quanto em contabil-empresa-detalhe
 * (visão do contador).
 */
export default function CardComprarCreditosAvulsos({ empresaId }) {
  const [pacotes, setPacotes] = useState(null);
  const [erro, setErro] = useState(null);
  const [pacoteSelecionado, setPacoteSelecionado] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [resultadoPix, setResultadoPix] = useState(null);

  useEffect(() => {
    listarPacotesCreditosAvulsos()
      .then(setPacotes)
      .catch((e) => setErro(e.message));
  }, []);

  async function aoComprar(dados) {
    setProcessando(true);
    try {
      const resultado = await comprarCreditoAvulso(empresaId, { pacoteId: pacoteSelecionado.id, customerEmail: dados.customerEmail });
      setResultadoPix(resultado);
    } catch (e) {
      setErro(e.message);
    } finally {
      setProcessando(false);
    }
  }

  if (erro) return <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>;
  if (!pacotes) return <p className="text-sm text-gray-500">Carregando...</p>;
  if (pacotes.length === 0) return <p className="text-sm text-gray-500">Nenhum pacote de crédito disponível no momento.</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Precisa de uma consulta extra fora do que o plano já inclui? Compre créditos avulsos direto aqui, sem
        precisar passar pelo contador.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {pacotes.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setPacoteSelecionado(p);
              setResultadoPix(null);
            }}
            className={`rounded-md border p-3 text-left ${pacoteSelecionado?.id === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <p className="text-sm font-semibold text-gray-900">{p.quantidadeCreditos} créditos</p>
            <p className="text-sm text-gray-600">{formatarMoeda(p.precoReais)}</p>
          </button>
        ))}
      </div>

      {pacoteSelecionado && !resultadoPix && (
        <FormularioComprarCredito enviando={processando} onCancelar={() => setPacoteSelecionado(null)} onConfirmar={aoComprar} />
      )}

      {resultadoPix && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-center">
          <p className="mb-2 text-xs font-medium text-blue-800">PIX gerado -- pague pra liberar os créditos:</p>
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
          <p className="mt-2 text-xs text-blue-700">Os créditos são liberados automaticamente assim que o pagamento for confirmado.</p>
        </div>
      )}
    </div>
  );
}
