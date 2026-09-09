import { api } from './api';

export const listarPlanos = () => api.get('/planos');
export const obterAssinaturaAtual = (contadorId) => api.get(`/contadores/${contadorId}/assinatura`);
export const listarFaturas = (contadorId) => api.get(`/contadores/${contadorId}/faturas`);
export const cancelarAssinatura = (contadorId) => api.post(`/contadores/${contadorId}/assinatura/cancelar`);

export const iniciarCheckout = (contadorId, { planoId, successUrl, cancelUrl }) =>
  api.post(`/contadores/${contadorId}/assinatura/checkout`, { planoId, successUrl, cancelUrl });
