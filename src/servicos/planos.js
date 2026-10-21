import { api } from './api';

export const listarPlanos = () => api.get('/planos');
export const criarPlano = (dados) => api.post('/planos', dados);
export const atualizarPlano = (id, dados) => api.patch(`/planos/${id}`, dados);

export const listarConsultasIncluidas = (planoId) => api.get(`/planos/${planoId}/consultas-incluidas`);
export const definirConsultaIncluida = (planoId, idSistema, quantidadePorPeriodo) =>
  api.put(`/planos/${planoId}/consultas-incluidas/${idSistema}`, { quantidadePorPeriodo });
export const removerConsultaIncluida = (planoId, idSistema) =>
  api.delete(`/planos/${planoId}/consultas-incluidas/${idSistema}`);
