import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/apuracao-simples`;

export const listarCatalogoAtividadesServico = (empresaId) => api.get(`${base(empresaId)}/catalogo-atividades-servico`);

export const calcularRbt12 = (empresaId, competenciaReferencia) =>
  api.get(`${base(empresaId)}/rbt12?competenciaReferencia=${competenciaReferencia}`);

export const calcularFatorR = (empresaId, competenciaReferencia) =>
  api.get(`${base(empresaId)}/fator-r?competenciaReferencia=${competenciaReferencia}`);

export const calcularApuracaoSimples = (empresaId, competencia, chaveAtividadeServico) => {
  const query = new URLSearchParams({ competencia });
  if (chaveAtividadeServico) query.set('chaveAtividadeServico', chaveAtividadeServico);
  return api.get(`${base(empresaId)}/apuracao?${query.toString()}`);
};

export const definirReceitaMensal = (empresaId, dados) => api.put(`${base(empresaId)}/receita-mensal`, dados);
