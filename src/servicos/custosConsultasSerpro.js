import { api } from './api';

export const listarCustosConsultasSerpro = () => api.get('/custos-consultas-serpro');
export const definirCustoConsultaSerpro = (idSistema, custoReais, precoVendaReais) =>
  api.put(`/custos-consultas-serpro/${idSistema}`, {
    custoReais,
    ...(precoVendaReais !== undefined && precoVendaReais !== null && precoVendaReais !== '' ? { precoVendaReais } : {}),
  });
export const removerCustoConsultaSerpro = (idSistema) => api.delete(`/custos-consultas-serpro/${idSistema}`);

// api.get() é um wrapper fetch simples (não aceita {params} estilo axios) -- monta a
// querystring aqui, igual outros serviços do projeto.
export const listarRelatorioConsultasSerpro = (filtro = {}) => {
  const params = new URLSearchParams();
  if (filtro.contadorId) params.set('contadorId', filtro.contadorId);
  if (filtro.empresaId) params.set('empresaId', filtro.empresaId);
  if (filtro.idSistema) params.set('idSistema', filtro.idSistema);
  if (filtro.dataInicio) params.set('dataInicio', filtro.dataInicio);
  if (filtro.dataFim) params.set('dataFim', filtro.dataFim);
  const query = params.toString();
  return api.get(`/custos-consultas-serpro/relatorio${query ? `?${query}` : ''}`);
};
