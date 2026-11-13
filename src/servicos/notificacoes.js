import { api } from './api';

export const listarNotificacoes = () => api.get('/notificacoes');
export const marcarNotificacaoLida = (id) => api.patch(`/notificacoes/${id}/lida`);
