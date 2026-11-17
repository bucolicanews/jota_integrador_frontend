import { useEffect, useState } from 'react';
import { obterConfiguracaoLancamentosEsocial, salvarConfiguracaoLancamentosEsocial } from '../../servicos/esocial';
import { listarPlanoContas } from '../../servicos/planoContas';
import { showError, showSuccess } from '../../utils/toast';

/** Contas usadas quando um S-1200 (remuneração) é importado -- cada item (Salário, Pró-labore,
 * INSS, FGTS opcional) vira uma Conta a Pagar própria (débito despesa + crédito passivo),
 * mesmo caminho de contas a pagar de nota fiscal -- CriarContaPagarUseCase. Mesmo padrão de
 * SecaoLancamentosNotasFiscais.jsx pro resto. */
export default function SecaoLancamentosEsocial({ empresaId }) {
  const [contas, setContas] = useState([]);
  const [contaDespesaSalarioId, setContaDespesaSalarioId] = useState('');
  const [contaDespesaProLaboreId, setContaDespesaProLaboreId] = useState('');
  const [contaDespesaInssId, setContaDespesaInssId] = useState('');
  const [contaPassivoInssId, setContaPassivoInssId] = useState('');
  const [contaPassivoSalarioAPagarId, setContaPassivoSalarioAPagarId] = useState('');
  const [contaPassivoProLaboreAPagarId, setContaPassivoProLaboreAPagarId] = useState('');
  const [contaDespesaFgtsId, setContaDespesaFgtsId] = useState('');
  const [contaPassivoFgtsId, setContaPassivoFgtsId] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setCarregando(true);
    Promise.all([listarPlanoContas(empresaId), obterConfiguracaoLancamentosEsocial(empresaId)])
      .then(([dadosContas, config]) => {
        setContas(dadosContas);
        setContaDespesaSalarioId(config?.contaDespesaSalarioId ?? '');
        setContaDespesaProLaboreId(config?.contaDespesaProLaboreId ?? '');
        setContaDespesaInssId(config?.contaDespesaInssId ?? '');
        setContaPassivoInssId(config?.contaPassivoInssId ?? '');
        setContaPassivoSalarioAPagarId(config?.contaPassivoSalarioAPagarId ?? '');
        setContaPassivoProLaboreAPagarId(config?.contaPassivoProLaboreAPagarId ?? '');
        setContaDespesaFgtsId(config?.contaDespesaFgtsId ?? '');
        setContaPassivoFgtsId(config?.contaPassivoFgtsId ?? '');
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
      await salvarConfiguracaoLancamentosEsocial(empresaId, {
        contaDespesaSalarioId,
        contaDespesaProLaboreId,
        contaDespesaInssId,
        contaPassivoInssId,
        contaPassivoSalarioAPagarId,
        contaPassivoProLaboreAPagarId,
        contaDespesaFgtsId: contaDespesaFgtsId || null,
        contaPassivoFgtsId: contaPassivoFgtsId || null,
      });
      showSuccess('Configuração salva.');
    } catch (erro) {
      showError(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <p className="text-sm text-gray-500">Carregando...</p>;

  if (!contasDespesa.length || !contasPassivo.length) {
    return <p className="text-sm text-gray-500">Cadastre ao menos uma conta analítica de despesa e uma de passivo no Plano de Contas desta empresa antes de configurar.</p>;
  }

  const podeSalvar =
    contaDespesaSalarioId &&
    contaDespesaProLaboreId &&
    contaDespesaInssId &&
    contaPassivoInssId &&
    contaPassivoSalarioAPagarId &&
    contaPassivoProLaboreAPagarId;

  const seletor = (valor, aoMudar, lista, placeholder = 'Selecione...') => (
    <select value={valor} onChange={(e) => aoMudar(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
      <option value="">{placeholder}</option>
      {lista.map((conta) => (
        <option key={conta.id} value={conta.id}>
          {conta.codigo} -- {conta.nome}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Toda vez que um S-1200 (remuneração) for importado, este conjunto de contas é usado pra gerar o lançamento contábil da
        folha (débito despesa, crédito passivo) -- é esse lançamento que alimenta o Fator R.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Despesa com salários (débito)</label>
          {seletor(contaDespesaSalarioId, setContaDespesaSalarioId, contasDespesa)}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Despesa com pró-labore (débito)</label>
          {seletor(contaDespesaProLaboreId, setContaDespesaProLaboreId, contasDespesa)}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Despesa com INSS (débito)</label>
          {seletor(contaDespesaInssId, setContaDespesaInssId, contasDespesa)}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">INSS a recolher (crédito)</label>
          {seletor(contaPassivoInssId, setContaPassivoInssId, contasPassivo)}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Salários a pagar (crédito)</label>
          {seletor(contaPassivoSalarioAPagarId, setContaPassivoSalarioAPagarId, contasPassivo)}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Pró-labore a pagar (crédito)</label>
          {seletor(contaPassivoProLaboreAPagarId, setContaPassivoProLaboreAPagarId, contasPassivo)}
        </div>
      </div>

      <div className="rounded-md border border-dashed border-gray-300 p-3">
        <label className="mb-1 block text-sm font-medium text-gray-700">Encargo FGTS (opcional)</label>
        <p className="mb-2 text-xs text-gray-500">
          Se as 2 contas abaixo forem preenchidas, todo lançamento de folha inclui também o FGTS patronal (débito despesa,
          crédito passivo), calculado pela alíquota vigente na competência. Deixe em branco pra não lançar FGTS.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {seletor(contaDespesaFgtsId, setContaDespesaFgtsId, contasDespesa, 'Nenhuma -- não lança FGTS')}
          {seletor(contaPassivoFgtsId, setContaPassivoFgtsId, contasPassivo, 'Nenhuma -- não lança FGTS')}
        </div>
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
