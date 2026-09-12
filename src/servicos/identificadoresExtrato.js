import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/identificadores-extrato`;

export const listarIdentificadoresExtrato = (empresaId) => api.get(base(empresaId));
export const criarIdentificadorExtrato = (empresaId, descricao) => api.post(base(empresaId), { descricao });
export const atualizarIdentificadorExtrato = (empresaId, id, descricao) => api.patch(`${base(empresaId)}/${id}`, { descricao });
export const excluirIdentificadorExtrato = (empresaId, id) => api.delete(`${base(empresaId)}/${id}`);
