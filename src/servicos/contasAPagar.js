import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/contas-a-pagar`;

export const listarContasPagar = (empresaId, status) => api.get(`${base(empresaId)}${status ? `?status=${status}` : ''}`);

export const obterContaPagar = (empresaId, id) => api.get(`${base(empresaId)}/${id}`);

export const criarContaPagar = (empresaId, dados) => api.post(base(empresaId), dados);

export const cancelarContaPagar = (empresaId, id) => api.post(`${base(empresaId)}/${id}/cancelar`);

export const registrarPagamento = (empresaId, parcelaId, dados) => api.post(`${base(empresaId)}/parcelas/${parcelaId}/pagamentos`, dados);

export const listarPagamentosDaParcela = (empresaId, parcelaId) => api.get(`${base(empresaId)}/parcelas/${parcelaId}/pagamentos`);

export const estornarPagamento = (empresaId, pagamentoId, motivo) => api.post(`${base(empresaId)}/pagamentos/${pagamentoId}/estornar`, { motivo });
