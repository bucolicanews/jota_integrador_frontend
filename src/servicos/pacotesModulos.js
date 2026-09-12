import { api } from './api';

export const listarPacotesModulos = (apenasAtivos) => api.get(`/pacotes-modulos${apenasAtivos ? '?apenasAtivos=true' : ''}`);
export const criarPacoteModulos = (dados) => api.post('/pacotes-modulos', dados);
export const atualizarPacoteModulos = (id, dados) => api.patch(`/pacotes-modulos/${id}`, dados);
export const alternarAtivoPacoteModulos = (id, ativo) => api.patch(`/pacotes-modulos/${id}/ativo`, { ativo });
