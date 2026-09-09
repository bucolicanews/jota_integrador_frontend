import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { CabecalhoContabil } from '../../componentes/contabil/CabecalhoContabil';
import { listarPlanoContas } from '../../servicos/planoContas';
import { criarLancamento, estornarLancamento, listarLancamentos } from '../../servicos/lancamentos';

const ROTULO_ORIGEM = {
  manual: 'Manual',
  contas_a_pagar: 'Contas a pagar',
  contas_a_receber: 'Contas a receber',
  contrato: 'Contrato',
  conciliacao_bancaria: 'Conciliação bancária',
  estorno: 'Estorno',
};

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
const formatarData = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR') : '—');

function ModalNovoLancamento({ contas, aoFechar, aoCriar }) {
  const contasAnaliticas = contas.filter((c) => !c.sintetica && c.ativa);
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    defaultValues: {
      dataCompetencia: new Date().toISOString().slice(0, 10),
      historico: '',
      documentoReferencia: '',
      partidas: [
        { contaId: contasAnaliticas[0]?.id ?? '', tipo: 'debito', valor: '' },
        { contaId: contasAnaliticas[0]?.id ?? '', tipo: 'credito', valor: '' },
      ],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'partidas' });
  const partidasAtuais = watch('partidas');

  const { totalDebito, totalCredito } = useMemo(() => {
    let debito = 0;
    let credito = 0;
    for (const partida of partidasAtuais ?? []) {
      const valor = Number(partida.valor) || 0;
      if (partida.tipo === 'debito') debito += valor;
      else credito += valor;
    }
    return { totalDebito: debito, totalCredito: credito };
  }, [partidasAtuais]);
  const fecha = totalDebito > 0 && totalDebito === totalCredito;

  async function aoSubmeter(dados) {
    try {
      await aoCriar({
        dataCompetencia: dados.dataCompetencia,
        historico: dados.historico,
        documentoReferencia: dados.documentoReferencia || null,
        origem: 'manual',
        partidas: dados.partidas.map((p) => ({ contaId: p.contaId, tipo: p.tipo, valor: Number(p.valor) })),
      });
    } catch (erro) {
      setError('root', { message: erro.message ?? 'Não foi possível criar o lançamento' });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Novo lançamento</h2>
        <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Data *</label>
              <input
                type="date"
                {...register('dataCompetencia', { required: true })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Documento de referência</label>
              <input {...register('documentoReferencia')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Histórico *</label>
            <input
              {...register('historico', { required: 'Obrigatório', minLength: { value: 2, message: 'Muito curto' } })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {errors.historico && <p className="mt-1 text-xs text-red-600">{errors.historico.message}</p>}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Partidas *</label>
              <button
                type="button"
                onClick={() => append({ contaId: contasAnaliticas[0]?.id ?? '', tipo: 'debito', valor: '' })}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                + Adicionar partida
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2">
                  <div className="flex-1">
                    <select
                      {...register(`partidas.${index}.contaId`, { required: true })}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    >
                      {contasAnaliticas.map((conta) => (
                        <option key={conta.id} value={conta.id}>
                          {conta.codigo} — {conta.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <select
                    {...register(`partidas.${index}.tipo`)}
                    className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    <option value="debito">Débito</option>
                    <option value="credito">Crédito</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    {...register(`partidas.${index}.valor`, { required: true, min: 0.01 })}
                    className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 2}
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <p className={`mt-2 text-sm font-medium ${fecha ? 'text-green-700' : 'text-red-600'}`}>
              Débito: {formatarMoeda(totalDebito)} · Crédito: {formatarMoeda(totalCredito)}{' '}
              {fecha ? '✓ fecha' : '— precisa fechar antes de salvar'}
            </p>
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
              disabled={isSubmitting || !fecha}
              className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalEstorno({ lancamento, aoFechar, aoConfirmar }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm({
    defaultValues: { motivo: '' },
  });

  async function aoSubmeter(dados) {
    try {
      await aoConfirmar(dados.motivo);
    } catch (erro) {
      setError('root', { message: erro.message ?? 'Não foi possível estornar' });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Estornar lançamento</h2>
        <p className="mb-4 text-sm text-gray-600">
          Cria um lançamento inverso -- o original nunca é editado/apagado, fica marcado como estornado.
        </p>
        <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Motivo *</label>
            <textarea
              {...register('motivo', { required: 'Obrigatório', minLength: { value: 3, message: 'Muito curto' } })}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {errors.motivo && <p className="mt-1 text-xs text-red-600">{errors.motivo.message}</p>}
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
              className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Estornando...' : 'Estornar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ContabilLancamentos() {
  const { id: empresaId } = useParams();
  const [lancamentos, setLancamentos] = useState(null);
  const [contas, setContas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [expandidos, setExpandidos] = useState(new Set());
  const [modalAberto, setModalAberto] = useState(false);
  const [modalEstorno, setModalEstorno] = useState(null);

  const mapaContas = useMemo(() => Object.fromEntries(contas.map((c) => [c.id, c])), [contas]);

  async function carregar() {
    setCarregando(true);
    try {
      const [dadosLancamentos, dadosContas] = await Promise.all([
        listarLancamentos(empresaId, { dataInicio: dataInicio || undefined, dataFim: dataFim || undefined }),
        listarPlanoContas(empresaId),
      ]);
      setLancamentos(dadosLancamentos);
      setContas(dadosContas);
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
  }, [empresaId, dataInicio, dataFim]);

  function alternarExpansao(id) {
    const novo = new Set(expandidos);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    setExpandidos(novo);
  }

  async function aoCriarLancamento(dados) {
    await criarLancamento(empresaId, dados);
    setModalAberto(false);
    carregar();
  }

  async function aoConfirmarEstorno(motivo) {
    await estornarLancamento(empresaId, modalEstorno.id, motivo);
    setModalEstorno(null);
    carregar();
  }

  const contasAnaliticasExistem = contas.some((c) => !c.sintetica && c.ativa);

  return (
    <div className="min-h-screen bg-gray-50">
      <CabecalhoContabil />

      <main className="mx-auto max-w-6xl px-6 py-6">
        <Link to={`/contabil/empresas/${empresaId}`} className="mb-2 inline-block text-sm text-blue-600 hover:underline">
          ← Voltar para a empresa
        </Link>

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Lançamentos Contábeis</h1>
          <div className="flex gap-2">
            <Link
              to={`/contabil/empresas/${empresaId}/plano-contas`}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Plano de contas
            </Link>
            <button
              onClick={() => setModalAberto(true)}
              disabled={!contasAnaliticasExistem}
              title={!contasAnaliticasExistem ? 'Cadastre ao menos 2 contas analíticas no plano de contas primeiro' : undefined}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Novo lançamento
            </button>
          </div>
        </div>

        {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">De</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Até</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {carregando ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : lancamentos.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">Nenhum lançamento neste período.</p>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="w-8"></th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Histórico</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lancamentos.map((lancamento) => (
                  <Fragment key={lancamento.id}>
                    <tr>
                      <td className="px-2">
                        <button
                          onClick={() => alternarExpansao(lancamento.id)}
                          className="text-gray-400 hover:text-gray-700"
                        >
                          {expandidos.has(lancamento.id) ? '▾' : '▸'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatarData(lancamento.dataCompetencia)}</td>
                      <td className="px-4 py-3 text-gray-900">{lancamento.historico}</td>
                      <td className="px-4 py-3 text-gray-600">{ROTULO_ORIGEM[lancamento.origem] ?? lancamento.origem}</td>
                      <td className="px-4 py-3">
                        {lancamento.estornado ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            ⚪ Estornado
                          </span>
                        ) : lancamento.origem === 'estorno' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            🟡 Estorno
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                            🟢 Ativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!lancamento.estornado && lancamento.origem !== 'estorno' && (
                          <button
                            onClick={() => setModalEstorno(lancamento)}
                            className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Estornar
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandidos.has(lancamento.id) && (
                      <tr>
                        <td colSpan={6} className="bg-gray-50 p-0">
                          <table className="w-full text-left text-xs">
                            <thead className="text-gray-500">
                              <tr>
                                <th className="px-4 py-1.5 font-medium">Conta</th>
                                <th className="px-4 py-1.5 font-medium">Tipo</th>
                                <th className="px-4 py-1.5 text-right font-medium">Valor</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {lancamento.partidas.map((partida) => (
                                <tr key={partida.id}>
                                  <td className="px-4 py-1.5 text-gray-800">
                                    {mapaContas[partida.contaId]
                                      ? `${mapaContas[partida.contaId].codigo} — ${mapaContas[partida.contaId].nome}`
                                      : partida.contaId}
                                  </td>
                                  <td className="px-4 py-1.5 capitalize text-gray-600">{partida.tipo}</td>
                                  <td className="px-4 py-1.5 text-right font-medium text-gray-900">{formatarMoeda(partida.valor)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modalAberto && (
        <ModalNovoLancamento contas={contas} aoFechar={() => setModalAberto(false)} aoCriar={aoCriarLancamento} />
      )}

      {modalEstorno && (
        <ModalEstorno lancamento={modalEstorno} aoFechar={() => setModalEstorno(null)} aoConfirmar={aoConfirmarEstorno} />
      )}
    </div>
  );
}
