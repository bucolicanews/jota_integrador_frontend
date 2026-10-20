import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/das`;

export const listarDas = (empresaId) => api.get(base(empresaId));

export const obterUrlPdfDas = (empresaId, dasId) => api.get(`${base(empresaId)}/${dasId}/url`);

export const sincronizarDas = (empresaId) => api.post(`${base(empresaId)}/sincronizar`, {});
