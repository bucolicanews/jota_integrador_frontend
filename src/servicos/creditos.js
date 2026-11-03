import { api } from './api';

// Créditos SERPRO são por EMPRESA-CLIENTE (não mais por contador), mudança de 2026-10-14.
export const obterSaldoCreditos = (empresaId) => api.get(`/empresas/${empresaId}/creditos/saldo`);

/** Nome do evento global pra avisar o indicador de saldo no Header (ele não refaz fetch sozinho ao navegar). */
export const EVENTO_SALDO_CREDITOS_ATUALIZADO = 'saldo-creditos-atualizado';

/** Chame depois de qualquer ação que gaste/credite crédito, pra o Header atualizar o saldo na hora. */
export const notificarSaldoCreditosAtualizado = () => window.dispatchEvent(new Event(EVENTO_SALDO_CREDITOS_ATUALIZADO));
export const listarMovimentosCreditos = (empresaId) => api.get(`/empresas/${empresaId}/creditos/movimentos`);
export const creditarManualmente = (empresaId, { quantidade, motivo }) =>
  api.post(`/empresas/${empresaId}/creditos/creditar`, { quantidade, motivo });
export const debitarManualmente = (empresaId, { quantidade, motivo }) =>
  api.post(`/empresas/${empresaId}/creditos/debitar`, { quantidade, motivo });
