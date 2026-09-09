import { api } from './api';

export const obterSaldoCreditos = (contadorId) => api.get(`/contadores/${contadorId}/creditos/saldo`);
export const listarMovimentosCreditos = (contadorId) => api.get(`/contadores/${contadorId}/creditos/movimentos`);
export const creditarManualmente = (contadorId, { quantidade, motivo }) =>
  api.post(`/contadores/${contadorId}/creditos/creditar`, { quantidade, motivo });
