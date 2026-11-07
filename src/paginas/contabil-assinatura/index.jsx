import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LayoutPrincipal from '../../components/layout/LayoutPrincipal';
import FormularioCheckoutPagbank from '../../components/pagbank/FormularioCheckoutPagbank';
import { useEmpresaAtiva } from '../../hooks/useEmpresaAtiva';
import { obterEmpresa } from '../../servicos/empresas';
import {
  ativarAssinaturaManual,
  bloquearAssinatura,
  cancelarAssinatura,
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

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
const formatarData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

function CardPlano({ plano, planoRevenda, podeGerenciar, ehSuperAdmin, onAtivarManual, onCobrar, processando, resultadoPagamento }) {
  const expirado = plano.dataValidade && plano.dataValidade < new Date().toISOString().slice(0, 10);
  // null | 'proprio' (contador paga o custo, PIX ou cartão) | 'cliente' (gera cobrança
  // pro cliente pagar depois, preço de venda completo, só PIX -- contador nunca digita
  // cartão de quem não é ele).
  const [modoCheckout, setModoCheckout] = useState(null);

  const linkMailto = resultadoPagamento?.pagoPeloContador === false && resultadoPagamento?.pixCode
    ? `mailto:${resultadoPagamento.customerEmail}?subject=${encodeURIComponent(`Pagamento -- ${plano.nome}`)}&body=${encodeURIComponent(
        `Olá! Segue o código PIX pra ativar o plano "${plano.nome}":\n\n${resultadoPagamento.pixCode}`,
      )}`
    : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">{plano.nome}</h3>
      {plano.descricao && <p className="mt-1 text-sm text-gray-500">{plano.descricao}</p>}
      <p className="mt-1 text-2xl font-bold text-gray-900">
        {plano.gratuito ? 'Grátis' : `${formatarMoeda(plano.preco)}/${plano.periodicidade === 'anual' ? 'ano' : 'mês'} (custo da Jota)`}
      </p>
      {planoRevenda && (
        <p className="mt-1 text-sm font-medium text-blue-700">Seu preço de venda: {formatarMoeda(planoRevenda.valorVenda)}</p>
      )}
      {plano.dataValidade && <p className="mt-1 text-xs text-gray-500">Válido até {formatarData(plano.dataValidade)}</p>}

      {podeGerenciar && !expirado && (
        <div className="mt-4 flex flex-wrap gap-2">
          {ehSuperAdmin && (
            <button
              onClick={() => onAtivarManual(plano, planoRevenda)}
              disabled={processando}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Ativar sem cobrar
            </button>
          )}
          <button
            onClick={() => setModoCheckout('proprio')}
            disabled={processando}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Eu pago agora
          </button>
          {planoRevenda ? (
            <button
              onClick={() => setModoCheckout('cliente')}
              disabled={processando}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Cliente paga depois
            </button>
          ) : (
            <p className="text-xs text-gray-400">Cadastre seu preço de venda (Minhas Licenças) pra cobrar do cliente.</p>
          )}
        </div>
      )}
      {expirado && <p className="mt-4 text-xs text-red-600">Plano expirado.</p>}

      {modoCheckout && !resultadoPagamento && (
        <FormularioCheckoutPagbank
          enviando={processando}
          somentePix={modoCheckout === 'cliente'}
          rotuloConfirmarPix={modoCheckout === 'proprio' ? 'Gerar PIX e pagar' : 'Gerar PIX pro cliente'}
          onCancelar={() => setModoCheckout(null)}
          onConfirmar={(dados) => onCobrar(plano, { ...dados, pagoPeloContador: modoCheckout === 'proprio' })}
        />
      )}

      {resultadoPagamento && (
        <FormularioCheckoutPagbank resultado={resultadoPagamento} onConfirmar={() => {}} onCancelar={() => {}} />
      )}

      {linkMailto && (
        <a
          href={linkMailto}
          className="mt-2 inline-block rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Enviar por e-mail pro cliente
        </a>
      )}
    </div>
  );
}

export default function ContabilAssinatura() {
  const { usuario } = useSelector((state) => state.autenticacao);
  const ehSuperAdmin = usuario?.papel === 'SUPER_ADMIN';
  const podeConfigurarPagbankPlataforma = ['SUPER_ADMIN', 'ADMIN_FINANCEIRO'].includes(usuario?.papel);
  const { empresaId, empresaAtiva, ehContador, precisaSelecionarEmpresa } = useEmpresaAtiva();
  const [contadorId, setContadorId] = useState(null);
  const [ehEscritorioProprio, setEhEscritorioProprio] = useState(false);
  const [assinatura, setAssinatura] = useState(null);
  const [planos, setPlanos] = useState([]);
  const [planosRevenda, setPlanosRevenda] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [processandoPlanoId, setProcessandoPlanoId] = useState(null);
  const [bloqueando, setBloqueando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [resultadosPix, setResultadosPix] = useState({}); // { [planoId]: { pixCode, pixQrUrl } }

  async function carregar() {
    setCarregando(true);
    try {
      const empresa = await obterEmpresa(empresaId);
      setContadorId(empresa.contadorId);

      // Empresa interna_contador (o próprio escritório) nunca tem assinatura de verdade --
      // sempre liberada direto, sem precisar "assinar" nada (ver migration
      // 20260912000002/empresa_interna_contador_padrao). Sem essa checagem a tela mostrava
      // o grid de planos como se o contador pudesse assinar o próprio escritório.
      if (empresa.tipo === 'interna_contador') {
        setEhEscritorioProprio(true);
        setErro(null);
        return;
      }
      setEhEscritorioProprio(false);

      const [dadosAssinatura, dadosPlanos, dadosPlanosRevenda] = await Promise.all([
        obterAssinatura(empresa.contadorId, empresaId),
        listarPlanos(),
        listarPlanosRevendaCreditos(empresa.contadorId).catch(() => []),
      ]);
      setAssinatura(dadosAssinatura);
      setPlanos(dadosPlanos);
      setPlanosRevenda(dadosPlanosRevenda);
      setErro(null);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (empresaId) carregar();
    else setCarregando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  async function aoAtivarManual(plano, planoRevenda) {
    setProcessandoPlanoId(plano.id);
    setErro(null);
    try {
      await ativarAssinaturaManual(contadorId, empresaId, { planoId: plano.id, planoRevendaId: planoRevenda?.id ?? null });
      await carregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setProcessandoPlanoId(null);
    }
  }

  async function aoCobrar(plano, dados) {
    setProcessandoPlanoId(plano.id);
    setErro(null);
    try {
      const resultado = await iniciarPagamentoAssinatura(contadorId, empresaId, { planoId: plano.id, ...dados });
      setResultadosPix((atual) => ({ ...atual, [plano.id]: { ...resultado, customerEmail: dados.customerEmail, pagoPeloContador: dados.pagoPeloContador } }));
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setProcessandoPlanoId(null);
    }
  }

  async function aoBloquear() {
    if (!window.confirm('Bloquear o acesso desta empresa à plataforma inteira (não só SERPRO)? O saldo de créditos não é apagado -- você pode reativar depois.')) return;
    setBloqueando(true);
    try {
      await bloquearAssinatura(contadorId, empresaId);
      await carregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setBloqueando(false);
    }
  }

  async function aoCancelar() {
    if (!window.confirm('Cancelar esta assinatura de vez? O vínculo com o plano é apagado (saldo de créditos permanece) -- pra voltar a ter acesso, a empresa precisa ser ativada/pagar de novo.')) return;
    setCancelando(true);
    try {
      await cancelarAssinatura(contadorId, empresaId);
      await carregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setCancelando(false);
    }
  }

  const planoAtual = assinatura ? planos.find((p) => p.id === assinatura.planoId) : null;
  const statusInfo = assinatura ? STATUS_ASSINATURA[assinatura.status] : null;
  const planoRevendaPorPlano = (planoId) => planosRevenda.find((pr) => pr.planoId === planoId && pr.ativo);

  return (
    <LayoutPrincipal>
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">
          Assinatura de Créditos{empresaAtiva?.razaoSocial ? ` — ${empresaAtiva.razaoSocial}` : ''}
        </h1>

        {erro && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
            <span>{erro}</span>
            {erro.includes('Conta PagBank da plataforma não configurada') && podeConfigurarPagbankPlataforma && (
              <Link to="/configuracoes" className="shrink-0 rounded-md border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100">
                Configurar agora
              </Link>
            )}
          </div>
        )}

        {precisaSelecionarEmpresa || !empresaId ? (
          <p className="rounded-lg bg-white p-6 text-sm text-gray-500 shadow">
            Selecione uma empresa no topo da tela pra ver a assinatura dela.
          </p>
        ) : carregando ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : ehEscritorioProprio ? (
          <p className="rounded-lg bg-white p-6 text-sm text-gray-500 shadow">
            Esta é a empresa do seu próprio escritório -- ela não assina plano de créditos SERPRO, sempre fica liberada.
            Assinatura se aplica só às empresas-cliente da sua carteira.
          </p>
        ) : (
          <>
            {assinatura && (
              <div className="mb-8 rounded-lg bg-white p-6 shadow">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900">Plano atual</h2>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.cor}`}>
                    {statusInfo.icone} {statusInfo.rotulo}
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{planoAtual?.nome ?? 'Plano'}</p>

                {ehContador && assinatura.status !== 'cancelada' && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {assinatura.status === 'ativa' && (
                      <button
                        onClick={aoBloquear}
                        disabled={bloqueando}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {bloqueando ? 'Bloqueando...' : 'Bloquear acesso'}
                      </button>
                    )}
                    <button
                      onClick={aoCancelar}
                      disabled={cancelando}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {cancelando ? 'Cancelando...' : 'Cancelar assinatura'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="mb-4 text-sm text-gray-600">
                {assinatura ? 'Trocar ou renovar o plano:' : 'Nenhuma assinatura ainda -- escolha um plano pra ativar:'}
              </p>
              {planos.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum plano disponível no momento.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {planos.map((plano) => (
                    <CardPlano
                      key={plano.id}
                      plano={plano}
                      planoRevenda={planoRevendaPorPlano(plano.id)}
                      podeGerenciar={ehContador}
                      ehSuperAdmin={ehSuperAdmin}
                      onAtivarManual={aoAtivarManual}
                      onCobrar={aoCobrar}
                      processando={processandoPlanoId === plano.id}
                      resultadoPagamento={resultadosPix[plano.id]}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </LayoutPrincipal>
  );
}
