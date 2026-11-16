import { api } from './api';

export const consultarCnpj = (cnpj) => api.get(`/consulta-cnpj/${cnpj.replace(/\D/g, '')}`);
