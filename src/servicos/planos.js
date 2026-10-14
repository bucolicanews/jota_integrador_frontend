import { api } from './api';

export const listarPlanos = () => api.get('/planos');
export const criarPlano = (dados) => api.post('/planos', dados);
export const atualizarPlano = (id, dados) => api.patch(`/planos/${id}`, dados);
