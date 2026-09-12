import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/clientes`;

export const listarClientes = (empresaId, apenasAtivos) => api.get(`${base(empresaId)}${apenasAtivos ? '?apenasAtivos=true' : ''}`);

export const criarCliente = (empresaId, dados) => api.post(base(empresaId), dados);

export const atualizarCliente = (empresaId, id, dados) => api.patch(`${base(empresaId)}/${id}`, dados);

export const desativarCliente = (empresaId, id) => api.patch(`${base(empresaId)}/${id}/desativar`);

export const reativarCliente = (empresaId, id) => api.patch(`${base(empresaId)}/${id}/reativar`);
