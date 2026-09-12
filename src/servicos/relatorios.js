import { api } from './api';

export const obterBalancete = (empresaId, dataInicio, dataFim) =>
  api.get(`/empresas/${empresaId}/relatorios/balancete?dataInicio=${dataInicio}&dataFim=${dataFim}`);

export const obterBalancoPatrimonial = (empresaId, dataFim) =>
  api.get(`/empresas/${empresaId}/relatorios/balanco-patrimonial?dataFim=${dataFim}`);

export const obterDre = (empresaId, dataInicio, dataFim) =>
  api.get(`/empresas/${empresaId}/relatorios/dre?dataInicio=${dataInicio}&dataFim=${dataFim}`);

export const obterRazao = (empresaId, dataInicio, dataFim, contaId) => {
  const query = new URLSearchParams({ dataInicio, dataFim });
  if (contaId) query.set('contaId', contaId);
  return api.get(`/empresas/${empresaId}/relatorios/razao?${query.toString()}`);
};

export const obterFluxoCaixa = (empresaId, dataInicio, dataFim) =>
  api.get(`/empresas/${empresaId}/relatorios/fluxo-caixa?dataInicio=${dataInicio}&dataFim=${dataFim}`);
