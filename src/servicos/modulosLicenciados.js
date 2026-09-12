import { api } from './api';

export const obterModulosLiberados = (empresaId) => api.get(`/empresas/${empresaId}/modulos`);
