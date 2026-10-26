import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import LayoutPrincipal from '../../components/layout/LayoutPrincipal';
import FormularioCheckoutPagbank from '../../components/pagbank/FormularioCheckoutPagbank';
import { listarEmpresas } from '../../servicos/empresas';
import { atualizarPagbankConta, obterStatusPagbankConta } from '../../servicos/pagbankLicencas';
import { criarCobrancaHonorario, listarHonorariosDoContador } from '../../servicos/honorarios';

const STATUS_COBRANCA = {
  pendente: { rotulo: 'Pendente', cor: 'bg-amber-50 text-amber-700', icone: '🟡' },
  pago: { rotulo: 'Pago', cor: 'bg-green-50 text-green-700', icone: '🟢' },
  falhou: { rotulo: 'Falhou', cor: 'bg-red-50 text-red-700', icone: '🔴' },
  estornado: { rotulo: 'Estornado', cor: 'bg-gray-100 text-gray-600', icone: '⚪' },
};

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
const formatarData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

/** Cadastro manual da conta PagBank do contador -- mesmo endpoint já usado em Minhas Licenças, sem onboarding próprio. */
function CardConfiguracaoPagbank({ contadorId, onAtualizado }) {
  const [status, setStatus] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [accountId, setAccountId] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  function carregar() {
    setCarregando(true);
    obterStatusPagbankConta(contadorId)
      .then(setStatus)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [contadorId]);

  async function salvar() {
    if (!accountId.trim()) {
      setErro('Informe o ID da conta PagBank.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await atualizarPagbankConta(contadorId, accountId.trim());
      setAccountId('');
      carregar();
      onAtualizado();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Configuração de recebimento (PagBank)</h2>

      {erro && <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

      {carregando ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : status.temContaCadastrada ? (
        <p className="text-sm text-green-700">🟢 Pronto para receber honorários das empresas da carteira.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-600">
            Pra cobrar com split automático (você recebe sua parte, a Jota recebe a comissão), cadastre o ID da sua
            conta PagBank -- encontrado no painel da própria PagBank.
          </p>
          <div className="flex gap-2">
            <input
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="ID da conta PagBank"
              className="max-w-xs flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={salvar}
              disabled={salvando}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Cadastrar'}
            </button>
          </div>
        </>
      )}
      {!carregando && status && !status.splitHabilitado && (
        <p className="mt-2 text-xs text-gray-500">(split temporariamente indisponível na plataforma)</p>
      )}
    </div>
  );
}

function ModalNovaCobranca({ empresas, contadorId, aoFechar }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { empresaId: empresas[0]?.id ?? '', descricao: '', valor: '' } });
  const [dadosBase, setDadosBase] = useState(null); // { empresaId, descricao, valor }
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  function aoDefinirDados(dados) {
    setDadosBase(dados);
  }

  async function aoConfirmarPagamento(dadosPagamento) {
    setEnviando(true);
    setErro(null);
    try {
      const resposta = await criarCobrancaHonorario(contadorId, dadosBase.empresaId, {
        descricao: dadosBase.descricao,
        valor: Number(dadosBase.valor),
        metodo: dadosPagamento.metodo,
        cardEncrypted: dadosPagamento.cardEncrypted,
        installments: dadosPagamento.installments,
        customerEmail: dadosPagamento.customerEmail,
      });
      setResultado(resposta);
    } catch (e) {
      setErro(e.message ?? 'Não foi possível criar a cobrança');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        {dadosBase ? (
          <>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Cobrança de honorário</h2>
            <p className="mb-1 text-sm text-gray-600">{dadosBase.descricao}</p>
            <p className="mb-3 text-sm font-medium text-gray-900">{formatarMoeda(Number(dadosBase.valor))}</p>
            {resultado ? (
              <>
                <FormularioCheckoutPagbank
                  onConfirmar={() => {}}
                  onCancelar={() => {}}
                  resultado={resultado}
                  rotuloConfirmarPix="Gerar PIX"
                  rotuloConfirmarCartao="Cobrar com cartão"
                />
                <button
                  onClick={aoFechar}
                  className="mt-3 w-full rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Fechar
                </button>
              </>
            ) : (
              <FormularioCheckoutPagbank
                enviando={enviando}
                erro={erro}
                onCancelar={() => setDadosBase(null)}
                onConfirmar={aoConfirmarPagamento}
                rotuloConfirmarPix="Gerar PIX"
                rotuloConfirmarCartao="Cobrar com cartão"
              />
            )}
          </>
        ) : (
          <>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Nova cobrança de honorário</h2>
            <form onSubmit={handleSubmit(aoDefinirDados)} className="space-y-3">
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
                  Continuar
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
        obterStatusPagbankConta(contadorId),
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
    else setCarregando(false); // papel de plataforma (ex: SUPER_ADMIN) não tem contadorId próprio -- essa tela é por contador
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contadorId]);

  return (
    <LayoutPrincipal>
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">Honorários</h1>

        {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        {!contadorId ? (
          <p className="rounded-lg bg-white p-6 text-sm text-gray-500 shadow">
            Esta tela mostra os honorários de um contador específico -- entre com uma conta de contador para ver.
          </p>
        ) : carregando ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : (
          <>
            <CardConfiguracaoPagbank contadorId={contadorId} onAtualizado={carregar} />

            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Cobranças</h2>
              <button
                onClick={() => setModalAberto(true)}
                disabled={!status.temContaCadastrada || empresas.length === 0}
                title={!status.temContaCadastrada ? 'Cadastre sua conta PagBank primeiro' : undefined}
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
      </div>

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
    </LayoutPrincipal>
  );
}
