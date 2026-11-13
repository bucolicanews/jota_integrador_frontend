import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/bancos`;

export const listarBancos = (empresaId, apenasAtivos, tipo) => {
  const parametros = new URLSearchParams();
  if (apenasAtivos) parametros.set('apenasAtivos', 'true');
  if (tipo) parametros.set('tipo', tipo);
  const query = parametros.toString();
  return api.get(`${base(empresaId)}${query ? `?${query}` : ''}`);
};

export const criarBanco = (empresaId, dados) => api.post(base(empresaId), dados);

export const atualizarBanco = (empresaId, id, dados) => api.patch(`${base(empresaId)}/${id}`, dados);

export const desativarBanco = (empresaId, id) => api.patch(`${base(empresaId)}/${id}/desativar`);

export const reativarBanco = (empresaId, id) => api.patch(`${base(empresaId)}/${id}/reativar`);
