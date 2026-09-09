import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CabecalhoContabil } from '../../componentes/contabil/CabecalhoContabil';
import {
  atualizarContaContabil,
  criarContaContabil,
  desativarContaContabil,
  listarPlanoContas,
  reativarContaContabil,
} from '../../servicos/planoContas';
import { obterSaldoConta } from '../../servicos/lancamentos';

const ROTULO_GRUPO = {
  ativo: 'Ativo',
  passivo: 'Passivo',
  patrimonio_liquido: 'Patrimônio Líquido',
  receita: 'Receita',
  custo: 'Custo',
  despesa: 'Despesa',
};
const GRUPOS = Object.keys(ROTULO_GRUPO);

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);

function BadgeStatus({ ativa }) {
  return ativa ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
      🟢 Ativa
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      ⚪ Inativa
    </span>
  );
}

function ModalConta({ conta, contasSinteticas, aoFechar, aoSalvar }) {
  const editando = Boolean(conta);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    defaultValues: {
      codigo: conta?.codigo ?? '',
      nome: conta?.nome ?? '',
      grupo: conta?.grupo ?? 'ativo',
      sintetica: conta ? String(conta.sintetica) : 'false',
      contaPaiId: conta?.contaPaiId ?? '',
      contaCaixaBanco: conta?.contaCaixaBanco ?? false,
      contaAReceber: conta?.contaAReceber ?? false,
      contaAPagar: conta?.contaAPagar ?? false,
    },
  });

  async function aoSubmeter(dados) {
    try {
      if (editando) {
        await aoSalvar(conta.id, {
          nome: dados.nome,
          contaCaixaBanco: dados.contaCaixaBanco,
          contaAReceber: dados.contaAReceber,
          contaAPagar: dados.contaAPagar,
        });
      } else {
        await aoSalvar(null, {
          codigo: dados.codigo,
          nome: dados.nome,
          grupo: dados.grupo,
          sintetica: dados.sintetica === 'true',
          contaPaiId: dados.contaPaiId || null,
          contaCaixaBanco: dados.contaCaixaBanco,
          contaAReceber: dados.contaAReceber,
          contaAPagar: dados.contaAPagar,
        });
      }
    } catch (erro) {
      setError('root', { message: erro.message ?? 'Não foi possível salvar' });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{editando ? 'Editar conta' : 'Nova conta contábil'}</h2>
        <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Código *</label>
            <input
              {...register('codigo', { required: 'Obrigatório' })}
              disabled={editando}
              placeholder="Ex: 1.1.01"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
            {editando && <p className="mt-1 text-xs text-gray-400">Código não pode ser alterado depois de criado.</p>}
            {errors.codigo && <p className="mt-1 text-xs text-red-600">{errors.codigo.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome *</label>
            <input
              {...register('nome', { required: 'Obrigatório', minLength: { value: 2, message: 'Muito curto' } })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {errors.nome && <p className="mt-1 text-xs text-red-600">{errors.nome.message}</p>}
          </div>

          {!editando && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Grupo *</label>
                <select {...register('grupo')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {GRUPOS.map((grupo) => (
                    <option key={grupo} value={grupo}>
                      {ROTULO_GRUPO[grupo]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tipo *</label>
                <select {...register('sintetica')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="false">Analítica (recebe lançamento)</option>
                  <option value="true">Sintética (só agrupa outras contas)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Conta pai (opcional)</label>
                <select {...register('contaPaiId')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Nenhuma</option>
                  {contasSinteticas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} — {c.nome}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {watch('sintetica') !== 'true' && (
            <div className="space-y-1.5 rounded-md border border-gray-100 p-3">
              <p className="mb-1 text-xs font-medium text-gray-700">Uso especial (opcional)</p>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" {...register('contaCaixaBanco')} /> Caixa/Banco (usada na conciliação bancária)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" {...register('contaAReceber')} /> Contas a receber
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" {...register('contaAPagar')} /> Contas a pagar
              </label>
            </div>
          )}

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
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ContabilPlanoContas() {
  const { id: empresaId } = useParams();
  const [contas, setContas] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('todos');
  const [modalConta, setModalConta] = useState(null); // null | { conta?: PlanoConta }
  const [saldos, setSaldos] = useState({}); // contaId -> valor | 'carregando' | 'erro'

  async function carregar() {
    setCarregando(true);
    try {
      const dados = await listarPlanoContas(empresaId);
      setContas(dados);
      setErro(null);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  async function verSaldo(contaId) {
    setSaldos((atual) => ({ ...atual, [contaId]: 'carregando' }));
    try {
      const { saldo } = await obterSaldoConta(empresaId, contaId);
      setSaldos((atual) => ({ ...atual, [contaId]: saldo }));
    } catch {
      setSaldos((atual) => ({ ...atual, [contaId]: 'erro' }));
    }
  }

  async function aoSalvarConta(contaId, dados) {
    if (contaId) {
      await atualizarContaContabil(empresaId, contaId, dados);
    } else {
      await criarContaContabil(empresaId, dados);
    }
    setModalConta(null);
    carregar();
  }

  async function aoAlternarAtiva(conta) {
    if (!window.confirm(`${conta.ativa ? 'Desativar' : 'Reativar'} a conta ${conta.codigo} — ${conta.nome}?`)) return;
    try {
      if (conta.ativa) await desativarContaContabil(empresaId, conta.id);
      else await reativarContaContabil(empresaId, conta.id);
      carregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    }
  }

  const contasSinteticas = useMemo(() => (contas ?? []).filter((c) => c.sintetica && c.ativa), [contas]);

  const contasFiltradas = useMemo(() => {
    if (!contas) return [];
    const termo = busca.trim().toLowerCase();
    return contas.filter((conta) => {
      if (termo && !`${conta.codigo} ${conta.nome}`.toLowerCase().includes(termo)) return false;
      if (filtroGrupo !== 'todos' && conta.grupo !== filtroGrupo) return false;
      return true;
    });
  }, [contas, busca, filtroGrupo]);

  return (
    <div className="min-h-screen bg-gray-50">
      <CabecalhoContabil />

      <main className="mx-auto max-w-6xl px-6 py-6">
        <Link to={`/contabil/empresas/${empresaId}`} className="mb-2 inline-block text-sm text-blue-600 hover:underline">
          ← Voltar para a empresa
        </Link>

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Plano de Contas</h1>
          <div className="flex gap-2">
            <Link
              to={`/contabil/empresas/${empresaId}/lancamentos`}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Ver lançamentos
            </Link>
            <button
              onClick={() => setModalConta({})}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Nova conta
            </button>
          </div>
        </div>

        {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por código ou nome..."
            className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
          <select
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="todos">Todos os grupos</option>
            {GRUPOS.map((grupo) => (
              <option key={grupo} value={grupo}>
                {ROTULO_GRUPO[grupo]}
              </option>
            ))}
          </select>
        </div>

        {carregando ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : contasFiltradas.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">
            {contas.length === 0 ? 'Nenhuma conta cadastrada ainda.' : 'Nenhuma conta encontrada com esses filtros.'}
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Grupo</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Saldo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contasFiltradas.map((conta) => (
                  <tr key={conta.id}>
                    <td className="px-4 py-3 font-mono text-gray-600">{conta.codigo}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{conta.nome}</p>
                      <div className="mt-0.5 flex gap-1">
                        {conta.contaCaixaBanco && <span className="text-xs text-gray-400">🏦 caixa/banco</span>}
                        {conta.contaAReceber && <span className="text-xs text-gray-400">📥 a receber</span>}
                        {conta.contaAPagar && <span className="text-xs text-gray-400">📤 a pagar</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{ROTULO_GRUPO[conta.grupo]}</td>
                    <td className="px-4 py-3 text-gray-600">{conta.sintetica ? 'Sintética' : 'Analítica'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {conta.sintetica ? (
                        '—'
                      ) : saldos[conta.id] === undefined ? (
                        <button onClick={() => verSaldo(conta.id)} className="text-xs font-medium text-blue-600 hover:underline">
                          Ver saldo
                        </button>
                      ) : saldos[conta.id] === 'carregando' ? (
                        '...'
                      ) : saldos[conta.id] === 'erro' ? (
                        <span className="text-xs text-red-600">erro</span>
                      ) : (
                        formatarMoeda(saldos[conta.id])
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <BadgeStatus ativa={conta.ativa} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setModalConta({ conta })}
                          className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => aoAlternarAtiva(conta)}
                          className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                            conta.ativa
                              ? 'border-red-300 text-red-700 hover:bg-red-50'
                              : 'border-green-300 text-green-700 hover:bg-green-50'
                          }`}
                        >
                          {conta.ativa ? 'Desativar' : 'Reativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modalConta && (
        <ModalConta
          conta={modalConta.conta}
          contasSinteticas={contasSinteticas}
          aoFechar={() => setModalConta(null)}
          aoSalvar={aoSalvarConta}
        />
      )}
    </div>
  );
}
