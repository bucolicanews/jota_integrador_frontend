import { api } from './api';

export const listarEmpresas = () => api.get('/empresas');
export const obterEmpresa = (id) => api.get(`/empresas/${id}`);
export const criarEmpresa = (dados) => api.post('/empresas', dados);
export const atualizarEmpresa = (id, dados) => api.patch(`/empresas/${id}`, dados);
export const atualizarModoAcessoSerpro = (id, modoAcessoSerpro) =>
  api.patch(`/empresas/${id}/modo-acesso-serpro`, { modoAcessoSerpro });
export const bloquearEmpresa = (id, motivo) => api.post(`/empresas/${id}/bloquear`, { motivo });
export const desbloquearEmpresa = (id) => api.post(`/empresas/${id}/desbloquear`);
