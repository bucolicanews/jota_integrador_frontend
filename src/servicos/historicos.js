import { api } from './api';

export const listarHistoricos = (empresaId) => api.get(`/empresas/${empresaId}/historicos`);
export const criarHistorico = (empresaId, dados) => api.post(`/empresas/${empresaId}/historicos`, dados);
export const atualizarHistorico = (empresaId, id, dados) => api.patch(`/empresas/${empresaId}/historicos/${id}`, dados);
export const excluirHistorico = (empresaId, id) => api.delete(`/empresas/${empresaId}/historicos/${id}`);
