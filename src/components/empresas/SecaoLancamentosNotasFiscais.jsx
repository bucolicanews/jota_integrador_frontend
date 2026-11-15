import { useEffect, useState } from 'react';
import { obterConfiguracaoLancamentosNf, salvarConfiguracaoLancamentosNf } from '../../servicos/notasFiscais';
import { listarPlanoContas } from '../../servicos/planoContas';
import { showError, showSuccess } from '../../utils/toast';

/** Contas usadas quando uma nota fiscal capturada é aprovada -- entrada gera conta a pagar (Débito despesa / Crédito passivo), saída gera conta a receber (Débito ativo / Crédito receita). Mesmo padrão de SecaoLancamentosDas.jsx. */
export default function SecaoLancamentosNotasFiscais({ empresaId }) {
  const [contas, setContas] = useState([]);
  const [contaPatrimonialEntradaId, setContaPatrimonialEntradaId] = useState('');
  const [contaResultadoEntradaId, setContaResultadoEntradaId] = useState('');
  const [contaPatrimonialSaidaId, setContaPatrimonialSaidaId] = useState('');
  const [contaResultadoSaidaId, setContaResultadoSaidaId] = useState('');
  const [contaRecebimentoVistaId, setContaRecebimentoVistaId] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setCarregando(true);
    Promise.all([listarPlanoContas(empresaId), obterConfiguracaoLancamentosNf(empresaId)])
      .then(([dadosContas, config]) => {
        setContas(dadosContas);
        setContaPatrimonialEntradaId(config?.contaPatrimonialEntradaId ?? '');
        setContaResultadoEntradaId(config?.contaResultadoEntradaId ?? '');
        setContaPatrimonialSaidaId(config?.contaPatrimonialSaidaId ?? '');
        setContaResultadoSaidaId(config?.contaResultadoSaidaId ?? '');
        setContaRecebimentoVistaId(config?.contaRecebimentoVistaId ?? '');
      })
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }, [empresaId]);

  const contasAnaliticas = contas.filter((c) => !c.sintetica && c.ativa);
  // Débito da entrada aceita despesa OU custo -- compra de mercadoria/matéria-prima gera
  // CMV (grupo custo), não despesa administrativa.
  const contasDespesaOuCusto = contasAnaliticas.filter((c) => c.grupo === 'despesa' || c.grupo === 'custo');
  const contasPassivo = contasAnaliticas.filter((c) => c.grupo === 'passivo');
  const contasAtivo = contasAnaliticas.filter((c) => c.grupo === 'ativo');
  const contasReceita = contasAnaliticas.filter((c) => c.grupo === 'receita');
  const contasCaixaBanco = contasAnaliticas.filter((c) => c.contaCaixaBanco);

  async function salvar() {
    setSalvando(true);
    try {
      await salvarConfiguracaoLancamentosNf(empresaId, {
        contaPatrimonialEntradaId,
        contaResultadoEntradaId,
        contaPatrimonialSaidaId,
        contaResultadoSaidaId,
        contaRecebimentoVistaId: contaRecebimentoVistaId || null,
      });
      showSuccess('Configuração salva.');
    } catch (erro) {
      showError(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <p className="text-sm text-gray-500">Carregando...</p>;

  const faltaConta = !contasDespesaOuCusto.length || !contasPassivo.length || !contasAtivo.length || !contasReceita.length;
  if (faltaConta) {
    return (
      <p className="text-sm text-gray-500">
        Cadastre ao menos uma conta analítica de cada grupo (despesa ou custo, passivo, ativo, receita) no Plano de Contas desta empresa antes de configurar.
      </p>
    );
  }

  const podeSalvar = contaPatrimonialEntradaId && contaResultadoEntradaId && contaPatrimonialSaidaId && contaResultadoSaidaId;

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Toda vez que uma nota fiscal capturada for aprovada, este par de contas é usado pra gerar a conta a pagar (entrada) ou a receber
        (saída) junto com o lançamento em partida dobrada -- nunca acontece sozinho, só depois da aprovação manual na tela de Notas Fiscais.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Entrada -- conta de despesa ou custo (débito)</label>
          <select
            value={contaResultadoEntradaId}
            onChange={(e) => setContaResultadoEntradaId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            {contasDespesaOuCusto.map((conta) => (
              <option key={conta.id} value={conta.id}>
                {conta.codigo} -- {conta.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Entrada -- conta de passivo "a pagar" (crédito)</label>
          <select
            value={contaPatrimonialEntradaId}
            onChange={(e) => setContaPatrimonialEntradaId(e.target.value)}
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

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Saída -- conta de ativo "a receber" (débito)</label>
          <select
            value={contaPatrimonialSaidaId}
            onChange={(e) => setContaPatrimonialSaidaId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            {contasAtivo.map((conta) => (
              <option key={conta.id} value={conta.id}>
                {conta.codigo} -- {conta.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Saída -- conta de receita (crédito)</label>
          <select
            value={contaResultadoSaidaId}
            onChange={(e) => setContaResultadoSaidaId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione...</option>
            {contasReceita.map((conta) => (
              <option key={conta.id} value={conta.id}>
                {conta.codigo} -- {conta.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-md border border-dashed border-gray-300 p-3">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Conta de recebimento à vista -- NFCe paga em dinheiro (opcional)
        </label>
        <p className="mb-2 text-xs text-gray-500">
          Se preenchida, toda NFCe de saída paga 100% em dinheiro (tPag=01) lança direto nessa conta na aprovação (Débito
          Caixa/Banco, Crédito Receita) -- nunca passa por Contas a Receber, nem aparece lá. Cartão, PIX e transferência
          continuam indo pra Contas a Receber como "Aberta" de propósito -- baixados depois via Conciliação Bancária, quando o
          extrato real confirmar o valor.
        </p>
        <select
          value={contaRecebimentoVistaId}
          onChange={(e) => setContaRecebimentoVistaId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Nenhuma -- sempre "Aberta", baixa manual</option>
          {contasCaixaBanco.map((conta) => (
            <option key={conta.id} value={conta.id}>
              {conta.codigo} -- {conta.nome}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={salvar}
        disabled={salvando || !podeSalvar}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
      >
        {salvando ? 'Salvando...' : 'Salvar configuração'}
      </button>
    </div>
  );
}
