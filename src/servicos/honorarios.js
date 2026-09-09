import { api } from './api';

export const obterStatusStripeConnect = (contadorId) => api.get(`/contadores/${contadorId}/stripe-connect/status`);

export const iniciarOnboardingStripeConnect = (contadorId, { refreshUrl, returnUrl }) =>
  api.post(`/contadores/${contadorId}/stripe-connect/onboarding`, { refreshUrl, returnUrl });

export const listarHonorariosDoContador = (contadorId) => api.get(`/contadores/${contadorId}/honorarios`);

export const criarCobrancaHonorario = (contadorId, empresaId, { descricao, valor, successUrl, cancelUrl }) =>
  api.post(`/contadores/${contadorId}/empresas/${empresaId}/honorarios`, { descricao, valor, successUrl, cancelUrl });
