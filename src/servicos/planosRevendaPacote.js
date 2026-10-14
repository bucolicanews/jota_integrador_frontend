import { api } from './api';

export const listarPlanosRevenda = (contadorId) => api.get(`/contadores/${contadorId}/planos-revenda-pacote`);
export const criarPlanoRevenda = (contadorId, dados) => api.post(`/contadores/${contadorId}/planos-revenda-pacote`, dados);
export const atualizarPlanoRevenda = (contadorId, id, dados) =>
  api.patch(`/contadores/${contadorId}/planos-revenda-pacote/${id}`, dados);
