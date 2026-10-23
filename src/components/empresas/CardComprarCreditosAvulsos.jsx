import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  comprarCreditoAvulso,
  listarPacotesCreditosAvulsos,
  listarPacotesRevendaDisponiveis,
  obterConfiguracaoCreditosAvulsos,
} from '../../servicos/creditosAvulsos';

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
 * Top-up pontual de créditos SERPRO -- dois catálogos possíveis: pacote direto da
 * plataforma (a empresa compra pra si, ou o contador compra em nome dela, sem split) ou
 * pacote de revenda do PRÓPRIO contador dela (só ela compra, com split contador+Jota).
 * Mesmo padrão de PIX de contabil-assinatura/. Usado tanto em paginas/fiscal (visão da
 * empresa, `permitirRevenda`) quanto em contabil-empresa-detalhe (visão do contador, só
 * catálogo direto) -- pacote de revenda é produto do PRÓPRIO contador, ele nunca compra
 * em nome da empresa (backend bloqueia com 403, ver CreditosAvulsosController), então essa
 * seção some fora da visão da empresa.
 */
export default function CardComprarCreditosAvulsos({ empresaId, permitirRevenda = false }) {
  const [pacotesDiretos, setPacotesDiretos] = useState(null);
  const [pacotesRevenda, setPacotesRevenda] = useState([]);
  const [valorPorCredito, setValorPorCredito] = useState(null);
  const [quantidadeLivre, setQuantidadeLivre] = useState('');
  const [erro, setErro] = useState(null);
  const [selecionado, setSelecionado] = useState(null); // { origem: 'direto'|'revenda'|'livre', id, nome, quantidadeCreditos, preco }
  const [processando, setProcessando] = useState(false);
  const [resultadoPix, setResultadoPix] = useState(null);

  useEffect(() => {
    Promise.all([
      listarPacotesCreditosAvulsos(),
      // Revenda é opcional -- se a empresa não tem contador nenhum plano de revenda ativo, só esconde a seção.
      permitirRevenda ? listarPacotesRevendaDisponiveis(empresaId).catch(() => []) : Promise.resolve([]),
      obterConfiguracaoCreditosAvulsos(),
    ])
      .then(([diretos, revenda, configuracao]) => {
        setPacotesDiretos(diretos);
        setPacotesRevenda(revenda);
        setValorPorCredito(configuracao.valorPorCredito);
      })
      .catch((e) => setErro(e.message));
  }, [empresaId, permitirRevenda]);

  async function aoComprar(dados) {
    setProcessando(true);
    try {
      const resultado = await comprarCreditoAvulso(empresaId, {
        pacoteId: selecionado.origem === 'direto' ? selecionado.id : undefined,
        planoRevendaId: selecionado.origem === 'revenda' ? selecionado.id : undefined,
        quantidade: selecionado.origem === 'livre' ? selecionado.quantidadeCreditos : undefined,
        customerEmail: dados.customerEmail,
      });
      setResultadoPix(resultado);
    } catch (e) {
      setErro(e.message);
    } finally {
      setProcessando(false);
    }
  }

  function aoEscolherQuantidadeLivre() {
    const quantidade = Number(quantidadeLivre);
    if (!Number.isInteger(quantidade) || quantidade <= 0) return;
    setSelecionado({ origem: 'livre', id: null, nome: `${quantidade} créditos`, quantidadeCreditos: quantidade, preco: quantidade * valorPorCredito });
    setResultadoPix(null);
  }

  if (erro) return <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>;
  if (!pacotesDiretos || valorPorCredito === null) return <p className="text-sm text-gray-500">Carregando...</p>;

  function CardOpcao({ origem, item }) {
    const id = origem === 'direto' ? item.id : item.planoRevendaId;
    const preco = origem === 'direto' ? item.precoReais : item.valorVenda;
    const ativo = selecionado?.origem === origem && selecionado?.id === id;
    return (
      <button
        onClick={() => {
          setSelecionado({ origem, id, nome: item.nome, quantidadeCreditos: item.quantidadeCreditos, preco });
          setResultadoPix(null);
        }}
        className={`rounded-md border p-3 text-left ${ativo ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
      >
        <p className="text-sm font-semibold text-gray-900">{item.quantidadeCreditos} créditos</p>
        <p className="text-sm text-gray-600">{formatarMoeda(preco)}</p>
        {origem === 'revenda' && <p className="mt-0.5 text-xs text-muted-foreground">Vendido pelo seu contador</p>}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Precisa de uma consulta extra fora do que o plano já inclui? Compre créditos avulsos direto aqui, sem
        precisar passar pelo contador.
      </p>

      {pacotesDiretos.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">Direto da plataforma</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pacotesDiretos.map((p) => <CardOpcao key={p.id} origem="direto" item={p} />)}
          </div>
        </div>
      )}

      {pacotesRevenda.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">Do seu contador</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pacotesRevenda.map((p) => <CardOpcao key={p.planoRevendaId} origem="revenda" item={p} />)}
          </div>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">Quantidade livre ({formatarMoeda(valorPorCredito)}/crédito)</p>
        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Quantidade de créditos</label>
            <input
              type="number"
              min="1"
              value={quantidadeLivre}
              onChange={(e) => setQuantidadeLivre(e.target.value)}
              className="w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          {Number(quantidadeLivre) > 0 && (
            <p className="text-sm text-gray-600">= {formatarMoeda(Number(quantidadeLivre) * valorPorCredito)}</p>
          )}
          <button
            onClick={aoEscolherQuantidadeLivre}
            disabled={!Number.isInteger(Number(quantidadeLivre)) || Number(quantidadeLivre) <= 0}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Comprar
          </button>
        </div>
      </div>

      {selecionado && !resultadoPix && (
        <FormularioComprarCredito enviando={processando} onCancelar={() => setSelecionado(null)} onConfirmar={aoComprar} />
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
