import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { CabecalhoContabil } from '../../componentes/contabil/CabecalhoContabil';
import { listarEmpresas } from '../../servicos/empresas';
import {
  criarCobrancaHonorario,
  iniciarOnboardingStripeConnect,
  listarHonorariosDoContador,
  obterStatusStripeConnect,
} from '../../servicos/honorarios';

const STATUS_COBRANCA = {
  pendente: { rotulo: 'Pendente', cor: 'bg-amber-50 text-amber-700', icone: '🟡' },
  pago: { rotulo: 'Pago', cor: 'bg-green-50 text-green-700', icone: '🟢' },
  falhou: { rotulo: 'Falhou', cor: 'bg-red-50 text-red-700', icone: '🔴' },
  estornado: { rotulo: 'Estornado', cor: 'bg-gray-100 text-gray-600', icone: '⚪' },
};

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
const formatarData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

function CardStripeConnect({ contadorId, status }) {
  const [iniciando, setIniciando] = useState(false);
  const [erro, setErro] = useState(null);

  async function aoIniciarOnboarding() {
    setIniciando(true);
    setErro(null);
    try {
      const origem = window.location.origin;
      const { url } = await iniciarOnboardingStripeConnect(contadorId, {
        refreshUrl: `${origem}/contabil/honorarios`,
        returnUrl: `${origem}/contabil/honorarios`,
      });
      window.location.href = url;
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
      setIniciando(false);
    }
  }

  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Cadastro de recebimento (Stripe)</h2>

      {erro && <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

      {status.chargesEnabled ? (
        <p className="text-sm text-green-700">🟢 Pronto para receber honorários das empresas da carteira.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-600">
            É preciso concluir o cadastro na Stripe antes de cobrar honorários de qualquer empresa.
          </p>
          <button
            onClick={aoIniciarOnboarding}
            disabled={iniciando}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {iniciando ? 'Redirecionando...' : status.detailsSubmitted ? 'Continuar cadastro' : 'Iniciar cadastro'}
          </button>
        </>
      )}
    </div>
  );
}

function ModalNovaCobranca({ empresas, contadorId, aoFechar }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({ defaultValues: { empresaId: empresas[0]?.id ?? '', descricao: '', valor: '' } });
  const [linkGerado, setLinkGerado] = useState(null);
  const [copiado, setCopiado] = useState(false);

  async function aoSubmeter(dados) {
    try {
      const origem = window.location.origin;
      const { url } = await criarCobrancaHonorario(contadorId, dados.empresaId, {
        descricao: dados.descricao,
        valor: Number(dados.valor),
        successUrl: `${origem}/contabil/honorarios?pagamento=sucesso`,
        cancelUrl: `${origem}/contabil/honorarios?pagamento=cancelado`,
      });
      setLinkGerado(url);
    } catch (erro) {
      setError('root', { message: erro.message ?? 'Não foi possível criar a cobrança' });
    }
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(linkGerado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {linkGerado ? (
          <>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Cobrança criada</h2>
            <p className="mb-3 text-sm text-gray-600">Envie este link para a empresa realizar o pagamento:</p>
            <div className="mb-4 flex gap-2">
              <input readOnly value={linkGerado} className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-600" />
              <button
                onClick={copiarLink}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {copiado ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <button
              onClick={aoFechar}
              className="w-full rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Fechar
            </button>
          </>
        ) : (
          <>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Nova cobrança de honorário</h2>
            <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Empresa *</label>
                <select {...register('empresaId', { required: true })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.razaoSocial}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Descrição *</label>
                <input
                  {...register('descricao', { required: 'Obrigatório', minLength: { value: 2, message: 'Muito curto' } })}
                  placeholder="Ex: Honorários contábeis — setembro/2026"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                {errors.descricao && <p className="mt-1 text-xs text-red-600">{errors.descricao.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register('valor', { required: 'Obrigatório', min: { value: 0.01, message: 'Precisa ser maior que zero' } })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                {errors.valor && <p className="mt-1 text-xs text-red-600">{errors.valor.message}</p>}
              </div>

              {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={aoFechar}
                  className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Gerando...' : 'Gerar cobrança'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ContabilHonorarios() {
  const { usuario } = useSelector((state) => state.autenticacao);
  const contadorId = usuario?.contadorId;
  const [status, setStatus] = useState(null);
  const [cobrancas, setCobrancas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const [dadosStatus, dadosCobrancas, dadosEmpresas] = await Promise.all([
        obterStatusStripeConnect(contadorId),
        listarHonorariosDoContador(contadorId),
        listarEmpresas(),
      ]);
      setStatus(dadosStatus);
      setCobrancas(dadosCobrancas);
      setEmpresas(dadosEmpresas);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <CabecalhoContabil />

      <main className="mx-auto max-w-4xl px-6 py-6">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">Honorários</h1>

        {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        {carregando ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : (
          <>
            <CardStripeConnect contadorId={contadorId} status={status} />

            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Cobranças</h2>
              <button
                onClick={() => setModalAberto(true)}
                disabled={!status.chargesEnabled || empresas.length === 0}
                title={!status.chargesEnabled ? 'Conclua o cadastro de recebimento primeiro' : undefined}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Nova cobrança
              </button>
            </div>

            {cobrancas.length === 0 ? (
              <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">Nenhuma cobrança de honorário ainda.</p>
            ) : (
              <div className="overflow-hidden rounded-lg bg-white shadow">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Descrição</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Criada em</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cobrancas.map((cobranca) => {
                      const info = STATUS_COBRANCA[cobranca.status];
                      return (
                        <tr key={cobranca.id}>
                          <td className="px-4 py-3 text-gray-900">{cobranca.descricao}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{formatarMoeda(cobranca.valor)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatarData(cobranca.criadoEm)}</td>
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
          </>
        )}
      </main>

      {modalAberto && (
        <ModalNovaCobranca
          empresas={empresas}
          contadorId={contadorId}
          aoFechar={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}
    </div>
  );
}
