import { useEffect, useState } from 'react';
import {
  comprarCreditoAvulso,
  listarPacotesCreditosAvulsos,
  listarPacotesRevendaDisponiveis,
  obterConfiguracaoCreditosAvulsos,
} from '../../servicos/creditosAvulsos';
import FormularioCheckoutPagbank from '../pagbank/FormularioCheckoutPagbank';

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);

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
  const [erroCompra, setErroCompra] = useState(null);

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
    setErroCompra(null);
    try {
      const resultado = await comprarCreditoAvulso(empresaId, {
        pacoteId: selecionado.origem === 'direto' ? selecionado.id : undefined,
        planoRevendaId: selecionado.origem === 'revenda' ? selecionado.id : undefined,
        quantidade: selecionado.origem === 'livre' ? selecionado.quantidadeCreditos : undefined,
        metodo: dados.metodo,
        cardEncrypted: dados.cardEncrypted,
        installments: dados.installments,
        customerEmail: dados.customerEmail,
      });
      setResultadoPix(resultado);
    } catch (e) {
      setErroCompra(e.message);
    } finally {
      setProcessando(false);
    }
  }

  function aoEscolherQuantidadeLivre() {
    const quantidade = Number(quantidadeLivre);
    if (!Number.isInteger(quantidade) || quantidade <= 0) return;
    setSelecionado({ origem: 'livre', id: null, nome: `${quantidade} créditos`, quantidadeCreditos: quantidade, preco: quantidade * valorPorCredito });
    setResultadoPix(null);
    setErroCompra(null);
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
          setErroCompra(null);
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

      {selecionado && (
        <FormularioCheckoutPagbank
          enviando={processando}
          resultado={resultadoPix}
          erro={erroCompra}
          onCancelar={() => setSelecionado(null)}
          onConfirmar={aoComprar}
          rotuloConfirmarPix="Gerar PIX"
          rotuloConfirmarCartao="Comprar com cartão"
        />
      )}
    </div>
  );
}
