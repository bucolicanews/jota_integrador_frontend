import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/fornecedores`;

export const listarFornecedores = (empresaId, apenasAtivos) => api.get(`${base(empresaId)}${apenasAtivos ? '?apenasAtivos=true' : ''}`);

export const criarFornecedor = (empresaId, dados) => api.post(base(empresaId), dados);

export const atualizarFornecedor = (empresaId, id, dados) => api.patch(`${base(empresaId)}/${id}`, dados);

export const desativarFornecedor = (empresaId, id) => api.patch(`${base(empresaId)}/${id}/desativar`);

export const reativarFornecedor = (empresaId, id) => api.patch(`${base(empresaId)}/${id}/reativar`);
