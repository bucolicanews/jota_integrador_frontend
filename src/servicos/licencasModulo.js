import { api } from './api';

const base = (contadorId) => `/contadores/${contadorId}/licencas-modulo`;

export const listarLicencasModulo = (contadorId) => api.get(base(contadorId));

export const iniciarCheckoutLicenca = (contadorId, { pacoteId, successUrl, cancelUrl }) =>
  api.post(`${base(contadorId)}/checkout`, { pacoteId, successUrl, cancelUrl });

export const ativarLicenca = (contadorId, licencaId, { empresaId, valorCobrado, parcelamento }) =>
  api.post(`${base(contadorId)}/${licencaId}/ativar`, { empresaId, valorCobrado, parcelamento });

export const desativarLicenca = (contadorId, licencaId) => api.post(`${base(contadorId)}/${licencaId}/desativar`);
