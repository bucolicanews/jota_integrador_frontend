import { api } from './api';

export const obterMeuPerfil = () => api.get('/auth/me');

export const atualizarMeuNome = (nome) => api.patch('/auth/me', { nome });
