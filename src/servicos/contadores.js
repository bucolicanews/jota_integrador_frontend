import { api } from './api';

export const listarContadores = () => api.get('/contadores');
export const obterContador = (id) => api.get(`/contadores/${id}`);
export const criarContador = (dados) => api.post('/contadores', dados);
export const atualizarContador = (id, dados) => api.patch(`/contadores/${id}`, dados);
export const bloquearContador = (id, motivo) => api.post(`/contadores/${id}/bloquear`, { motivo });
export const desbloquearContador = (id) => api.post(`/contadores/${id}/desbloquear`);
