import { api } from './api';

export const obterMeuPerfil = () => api.get('/auth/me');

export const atualizarMeuNome = (nome) => api.patch('/auth/me', { nome });

export const atualizarMeuAvatar = (arquivo) => {
  const formData = new FormData();
  formData.append('arquivo', arquivo);
  return api.postFormData('/auth/me/avatar', formData);
};
