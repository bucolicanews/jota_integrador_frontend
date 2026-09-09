import { api } from './api';

// contadorId só é necessário quando quem chama tem papel de plataforma (SUPER_ADMIN etc.)
// consultando a carteira de UM contador específico -- contador vendo a própria carteira não precisa.
export const listarEmpresas = (contadorId) =>
  api.get(contadorId ? `/empresas?contadorId=${contadorId}` : '/empresas');
export const obterEmpresa = (id) => api.get(`/empresas/${id}`);
export const criarEmpresa = (dados) => api.post('/empresas', dados);
export const atualizarEmpresa = (id, dados) => api.patch(`/empresas/${id}`, dados);
export const atualizarModoAcessoSerpro = (id, modoAcessoSerpro) =>
  api.patch(`/empresas/${id}/modo-acesso-serpro`, { modoAcessoSerpro });
export const bloquearEmpresa = (id, motivo) => api.post(`/empresas/${id}/bloquear`, { motivo });
export const desbloquearEmpresa = (id) => api.post(`/empresas/${id}/desbloquear`);
