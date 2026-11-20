import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/notas-servico`;

export const listarNotasServicoPendentes = (empresaId) => api.get(`${base(empresaId)}/pendentes`);

export const obterPainelNotasServico = (empresaId, dataInicio, dataFim) =>
  api.get(`${base(empresaId)}/painel?dataInicio=${dataInicio}&dataFim=${dataFim}`);

export const obterDetalheNotaServico = (empresaId, id) => api.get(`${base(empresaId)}/${id}`);

export const aprovarNotaServico = (empresaId, id) => api.post(`${base(empresaId)}/${id}/aprovar`);

export const rejeitarNotaServico = (empresaId, id, motivoRejeicao) => api.post(`${base(empresaId)}/${id}/rejeitar`, { motivoRejeicao });

/** DANFSe vem como PDF cru (StreamableFile no backend), não { url } como XML/CCMEI/DAS -- por isso api.getArquivo() (Blob), não api.get(). */
export const obterDanfse = (empresaId, id, { situacao, canhoto } = {}) => {
  const params = new URLSearchParams();
  if (situacao !== undefined) params.set('situacao', situacao);
  if (canhoto !== undefined) params.set('canhoto', canhoto);
  const query = params.toString() ? `?${params.toString()}` : '';
  return api.getArquivo(`${base(empresaId)}/${id}/danfse${query}`);
};
