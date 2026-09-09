import { api } from './api';

export const listarLancamentos = (empresaId, filtro = {}) => {
  const params = new URLSearchParams();
  if (filtro.dataInicio) params.set('dataInicio', filtro.dataInicio);
  if (filtro.dataFim) params.set('dataFim', filtro.dataFim);
  if (filtro.contaId) params.set('contaId', filtro.contaId);
  const query = params.toString();
  return api.get(`/empresas/${empresaId}/lancamentos-contabeis${query ? `?${query}` : ''}`);
};
export const obterLancamento = (empresaId, id) => api.get(`/empresas/${empresaId}/lancamentos-contabeis/${id}`);
export const criarLancamento = (empresaId, dados) => api.post(`/empresas/${empresaId}/lancamentos-contabeis`, dados);
export const estornarLancamento = (empresaId, id, motivo) =>
  api.post(`/empresas/${empresaId}/lancamentos-contabeis/${id}/estornar`, { motivo });
export const obterSaldoConta = (empresaId, contaId) =>
  api.get(`/empresas/${empresaId}/lancamentos-contabeis/saldo/${contaId}`);
