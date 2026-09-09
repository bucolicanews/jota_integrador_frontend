import { api } from './api';

export const listarPlanoContas = (empresaId) => api.get(`/empresas/${empresaId}/plano-contas`);
export const criarContaContabil = (empresaId, dados) => api.post(`/empresas/${empresaId}/plano-contas`, dados);
export const atualizarContaContabil = (empresaId, contaId, dados) =>
  api.patch(`/empresas/${empresaId}/plano-contas/${contaId}`, dados);
export const desativarContaContabil = (empresaId, contaId) =>
  api.post(`/empresas/${empresaId}/plano-contas/${contaId}/desativar`);
export const reativarContaContabil = (empresaId, contaId) =>
  api.post(`/empresas/${empresaId}/plano-contas/${contaId}/reativar`);
