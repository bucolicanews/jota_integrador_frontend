import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/descricoes-extrato`;

export const listarDescricoesExtrato = (empresaId) => api.get(base(empresaId));
export const criarDescricaoExtrato = (empresaId, descricao) => api.post(base(empresaId), { descricao });
export const atualizarDescricaoExtrato = (empresaId, id, descricao) => api.patch(`${base(empresaId)}/${id}`, { descricao });
export const excluirDescricaoExtrato = (empresaId, id) => api.delete(`${base(empresaId)}/${id}`);
