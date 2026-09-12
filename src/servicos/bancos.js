import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/bancos`;

export const listarBancos = (empresaId, apenasAtivos) => api.get(`${base(empresaId)}${apenasAtivos ? '?apenasAtivos=true' : ''}`);

export const criarBanco = (empresaId, dados) => api.post(base(empresaId), dados);

export const atualizarBanco = (empresaId, id, dados) => api.patch(`${base(empresaId)}/${id}`, dados);

export const desativarBanco = (empresaId, id) => api.patch(`${base(empresaId)}/${id}/desativar`);

export const reativarBanco = (empresaId, id) => api.patch(`${base(empresaId)}/${id}/reativar`);
