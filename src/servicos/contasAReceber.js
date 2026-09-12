import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/contas-a-receber`;

export const listarContasReceber = (empresaId, status) => api.get(`${base(empresaId)}${status ? `?status=${status}` : ''}`);

export const obterContaReceber = (empresaId, id) => api.get(`${base(empresaId)}/${id}`);

export const criarContaReceber = (empresaId, dados) => api.post(base(empresaId), dados);

export const cancelarContaReceber = (empresaId, id) => api.post(`${base(empresaId)}/${id}/cancelar`);

export const registrarRecebimento = (empresaId, parcelaId, dados) => api.post(`${base(empresaId)}/parcelas/${parcelaId}/recebimentos`, dados);

export const listarRecebimentosDaParcela = (empresaId, parcelaId) => api.get(`${base(empresaId)}/parcelas/${parcelaId}/recebimentos`);

export const estornarRecebimento = (empresaId, recebimentoId, motivo) => api.post(`${base(empresaId)}/recebimentos/${recebimentoId}/estornar`, { motivo });
