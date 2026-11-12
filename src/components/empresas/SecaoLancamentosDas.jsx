import { useEffect, useState } from 'react';
import { obterConfiguracaoLancamentosDas, salvarConfiguracaoLancamentosDas } from '../../servicos/das';
import { listarPlanoContas } from '../../servicos/planoContas';
import { showError, showSuccess } from '../../utils/toast';

/** Contas usadas na provisão automática do DAS (Débito despesa / Crédito passivo) -- gerada toda vez que o sync acha DAS "a vencer"/"vencido" sem lançamento ainda. */
export default function SecaoLancamentosDas({ empresaId }) {
  const [contas, setContas] = useState([]);
  const [contaDebitoId, setContaDebitoId] = useState('');
  const [contaCreditoId, setContaCreditoId] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setCarregando(true);
    Promise.all([listarPlanoContas(empresaId), obterConfiguracaoLancamentosDas(empresaId)])
      .then(([dadosContas, config]) => {
        setContas(dadosContas);
        setContaDebitoId(config?.contaDebitoId ?? '');
        setContaCreditoId(config?.contaCreditoId ?? '');
      })
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }, [empresaId]);

  const contasAnaliticas = contas.filter((c) => !c.sintetica && c.ativa);
  const contasDespesa = contasAnaliticas.filter((c) => c.grupo === 'despesa');
  const contasPassivo = contasAnaliticas.filter((c) => c.grupo === 'passivo');

  async function salvar() {
    setSalvando(true);
    try {
      await salvarConfiguracaoLancamentosDas(empresaId, { contaDebitoId, contaCreditoId });
      showSuccess('Configuração salva.');
    } catch (erro) {
      showError(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <p className="text-sm text-gray-500">Carregando...</p>;

  if (contasDespesa.length === 0 || contasPassivo.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Cadastre ao menos uma conta analítica do grupo "despesa" e uma do grupo "passivo" no Plano de Contas desta empresa antes de configurar.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Toda vez que a sincronização encontrar um DAS "a vencer" ou "vencido" ainda sem lançamento, este par de contas é usado pra gerar a
        provisão automática (Débito despesa / Crédito passivo). A baixa (quando o DAS é pago) nunca é automática -- fica como pendência na
        tela de DAS, pro contador escolher caixa ou banco.
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Conta de despesa (débito)</label>
        <select
          value={contaDebitoId}
          onChange={(e) => setContaDebitoId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Selecione...</option>
          {contasDespesa.map((conta) => (
            <option key={conta.id} value={conta.id}>
              {conta.codigo} -- {conta.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Conta de passivo "DAS a pagar" (crédito)</label>
        <select
          value={contaCreditoId}
          onChange={(e) => setContaCreditoId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Selecione...</option>
          {contasPassivo.map((conta) => (
            <option key={conta.id} value={conta.id}>
              {conta.codigo} -- {conta.nome}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={salvar}
        disabled={salvando || !contaDebitoId || !contaCreditoId}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
      >
        {salvando ? 'Salvando...' : 'Salvar configuração'}
      </button>
    </div>
  );
}
