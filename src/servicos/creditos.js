import { api } from './api';

// Créditos SERPRO são por EMPRESA-CLIENTE (não mais por contador), mudança de 2026-10-14.
export const obterSaldoCreditos = (empresaId) => api.get(`/empresas/${empresaId}/creditos/saldo`);
export const listarMovimentosCreditos = (empresaId) => api.get(`/empresas/${empresaId}/creditos/movimentos`);
export const creditarManualmente = (empresaId, { quantidade, motivo }) =>
  api.post(`/empresas/${empresaId}/creditos/creditar`, { quantidade, motivo });
export const debitarManualmente = (empresaId, { quantidade, motivo }) =>
  api.post(`/empresas/${empresaId}/creditos/debitar`, { quantidade, motivo });
