import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import LayoutPrincipal from '../../components/layout/LayoutPrincipal';
import { useEmpresaAtiva } from '../../hooks/useEmpresaAtiva';
import { creditarManualmente, debitarManualmente, listarMovimentosCreditos, obterSaldoCreditos } from '../../servicos/creditos';

const formatarData = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

// Rótulo só pra deixar o texto legível -- nunca é usado pra calcular custo aqui,
// o número de operações incluídas no plano já é o que importa pro contador
// (docs/UX-UI.md: não expor custo por operação de forma granular).
const ROTULO_TIPO_OPERACAO = {
  AJUSTE_MANUAL: 'Ajuste manual',
  ATIVACAO_MANUAL: 'Ativação manual',
  RENOVACAO_ASSINATURA: 'Pagamento via PIX',
  CCMEI: 'Consulta CCMEI',
  CAIXA_POSTAL: 'Caixa Postal',
};

function rotularTipoOperacao(tipo) {
  return ROTULO_TIPO_OPERACAO[tipo] ?? tipo.replaceAll('_', ' ').toLowerCase();
}

/** Inserir/retirar créditos manualmente de forma avulsa -- exclusivo da plataforma (admin); contador e empresa nunca ajustam saldo direto (revertido em 2026-10-21 o acesso que o contador tinha desde 2026-10-14). */
function FormularioAjusteCreditoManual({ empresaId, aoConcluir }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, reset } = useForm({
    defaultValues: { quantidade: '', motivo: '' },
  });
  const [acaoEmCurso, setAcaoEmCurso] = useState(null); // 'creditar' | 'debitar' | null

  async function aoSubmeter(dados, acao) {
    setAcaoEmCurso(acao);
    try {
      const fn = acao === 'creditar' ? creditarManualmente : debitarManualmente;
      await fn(empresaId, { quantidade: Number(dados.quantidade), motivo: dados.motivo });
      reset();
      aoConcluir();
    } catch (erro) {
      setError('root', { message: erro.message ?? 'Não foi possível ajustar o saldo' });
    } finally {
      setAcaoEmCurso(null);
    }
  }

  return (
    <form className="mt-4 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Quantidade</label>
        <input
          type="number"
          min="1"
          {...register('quantidade', { required: true, min: { value: 1, message: 'Precisa ser positivo' } })}
          className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-700">Motivo</label>
        <input
          {...register('motivo', { required: 'Obrigatório' })}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleSubmit((dados) => aoSubmeter(dados, 'creditar'))}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {acaoEmCurso === 'creditar' ? 'Inserindo...' : 'Inserir créditos'}
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleSubmit((dados) => aoSubmeter(dados, 'debitar'))}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {acaoEmCurso === 'debitar' ? 'Retirando...' : 'Retirar créditos'}
      </button>
      {(errors.quantidade || errors.motivo || errors.root) && (
        <p className="w-full text-xs text-red-600">
          {errors.quantidade?.message || errors.motivo?.message || errors.root?.message}
        </p>
      )}
    </form>
  );
}

export default function ContabilCreditos() {
  const { empresaId, empresaAtiva, ehPlataforma, precisaSelecionarEmpresa } = useEmpresaAtiva();
  const [saldo, setSaldo] = useState(null);
  const [movimentos, setMovimentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  async function carregar() {
    setCarregando(true);
    try {
      const [dadosSaldo, dadosMovimentos] = await Promise.all([
        obterSaldoCreditos(empresaId),
        listarMovimentosCreditos(empresaId),
      ]);
      setSaldo(dadosSaldo.saldo);
      setMovimentos(dadosMovimentos);
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

  return (
    <LayoutPrincipal>
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">
          Créditos{empresaAtiva?.razaoSocial ? ` — ${empresaAtiva.razaoSocial}` : ''}
        </h1>

        {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        {precisaSelecionarEmpresa || !empresaId ? (
          <p className="rounded-lg bg-white p-6 text-sm text-gray-500 shadow">
            Selecione uma empresa no topo da tela pra ver os créditos dela.
          </p>
        ) : carregando ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : (
          <>
            <div className="mb-6 rounded-lg bg-white p-6 shadow">
              <p className="text-sm text-gray-500">Saldo disponível</p>
              <p className="text-3xl font-bold text-blue-600">{saldo}</p>
              <p className="mt-1 text-xs text-gray-500">operações fiscais incluídas no plano</p>

              {ehPlataforma && (
                <FormularioAjusteCreditoManual empresaId={empresaId} aoConcluir={carregar} />
              )}
            </div>

            <h2 className="mb-3 text-sm font-semibold text-gray-900">Extrato</h2>
            {movimentos.length === 0 ? (
              <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">Nenhuma movimentação ainda.</p>
            ) : (
              <div className="overflow-hidden rounded-lg bg-white shadow">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Quando</th>
                      <th className="px-4 py-3">Operação</th>
                      <th className="px-4 py-3">Motivo</th>
                      <th className="px-4 py-3 text-right">Qtd.</th>
                      <th className="px-4 py-3 text-right">Saldo após</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movimentos.map((movimento) => (
                      <tr key={movimento.id}>
                        <td className="px-4 py-3 text-gray-600">{formatarData(movimento.criadoEm)}</td>
                        <td className="px-4 py-3 text-gray-900">{rotularTipoOperacao(movimento.tipoOperacao)}</td>
                        <td className="px-4 py-3 text-gray-600">{movimento.motivo || '—'}</td>
                        <td className={`px-4 py-3 text-right font-medium ${movimento.quantidade < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {movimento.quantidade > 0 ? '+' : ''}
                          {movimento.quantidade}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{movimento.saldoDepois}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </LayoutPrincipal>
  );
}
