import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/esocial`;

export const obterConfiguracaoLancamentosEsocial = (empresaId) => api.get(`${base(empresaId)}/configuracao-lancamentos`);

export const salvarConfiguracaoLancamentosEsocial = (empresaId, dados) => api.put(`${base(empresaId)}/configuracao-lancamentos`, dados);

export const importarRemuneracaoEsocial = (empresaId, { arquivos, confirmar }) =>
  api.post(`${base(empresaId)}/importar-remuneracao`, { arquivos, confirmar });
