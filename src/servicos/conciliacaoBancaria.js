import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/conciliacao-bancaria`;

export const listarConfiguracoes = (empresaId, contaContabilId) =>
  api.get(`${base(empresaId)}/configuracoes${contaContabilId ? `?contaContabilId=${contaContabilId}` : ''}`);

export const criarConfiguracao = (empresaId, dados) => api.post(`${base(empresaId)}/configuracoes`, dados);

export const atualizarConfiguracao = (empresaId, id, dados) => api.patch(`${base(empresaId)}/configuracoes/${id}`, dados);

export const excluirConfiguracao = (empresaId, id) => api.delete(`${base(empresaId)}/configuracoes/${id}`);

/** multipart: arquivo do extrato + mapeamento de colunas -- backend persiste as transações desde o preview (idempotente por hash do arquivo). */
export const preVisualizarExtrato = (empresaId, { arquivo, contaContabilId, mapeamento, colunaTipoTransacao, valorCredito }) => {
  const formData = new FormData();
  formData.append('arquivo', arquivo);
  formData.append('contaContabilId', contaContabilId);
  formData.append('mapeamento', JSON.stringify(mapeamento));
  if (colunaTipoTransacao) formData.append('colunaTipoTransacao', colunaTipoTransacao);
  if (valorCredito) formData.append('valorCredito', valorCredito);
  return api.postFormData(`${base(empresaId)}/preview`, formData);
};

export const confirmarTransacoes = (empresaId, transacaoIds) => api.post(`${base(empresaId)}/confirmar`, { transacaoIds });

export const listarPendentes = (empresaId, contaContabilId) =>
  api.get(`${base(empresaId)}/pendentes${contaContabilId ? `?contaContabilId=${contaContabilId}` : ''}`);

export const atualizarContaResultado = (empresaId, transacaoId, contaContabilResultadoId) =>
  api.patch(`${base(empresaId)}/transacoes/${transacaoId}/conta-resultado`, { contaContabilResultadoId });

export const ignorarTransacao = (empresaId, transacaoId) => api.post(`${base(empresaId)}/transacoes/${transacaoId}/ignorar`);

export const listarImportacoes = (empresaId, contaContabilId) =>
  api.get(`${base(empresaId)}/importacoes${contaContabilId ? `?contaContabilId=${contaContabilId}` : ''}`);

/** Ledger de transações já conciliadas (com lançamento contábil gerado) -- usado na aba "Conciliadas" de Mapeamento. */
export const listarLancamentosConciliados = (empresaId, contaContabilId) =>
  api.get(`${base(empresaId)}/lancamentos${contaContabilId ? `?contaContabilId=${contaContabilId}` : ''}`);

export const obterDetalheImportacao = (empresaId, importacaoId) => api.get(`${base(empresaId)}/importacoes/${importacaoId}`);

/** "Mapear Agora" -- sugestões de parcelas de Contas a Pagar/Receber pra quitar essa transação. */
export const buscarParcelasCandidatas = (empresaId, transacaoId) => api.get(`${base(empresaId)}/transacoes/${transacaoId}/parcelas-candidatas`);

export const vincularParcela = (empresaId, transacaoId, { parcelaId, tipo }) =>
  api.post(`${base(empresaId)}/transacoes/${transacaoId}/vincular-parcela`, { parcelaId, tipo });

/** Lança uma movimentação de caixa/banco sem CSV -- já grava conciliada, então uma importação futura reconhece a mesma linha como duplicada em vez de lançar de novo. */
export const registrarExtratoManual = (empresaId, dados) => api.post(`${base(empresaId)}/extrato-manual`, dados);
