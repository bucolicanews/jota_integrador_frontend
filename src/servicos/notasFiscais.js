import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/notas-fiscais`;

export const listarNotasFiscaisPendentes = (empresaId) => api.get(`${base(empresaId)}/pendentes`);

export const obterPainelNotasFiscais = (empresaId, dataInicio, dataFim) =>
  api.get(`${base(empresaId)}/painel?dataInicio=${dataInicio}&dataFim=${dataFim}`);

export const obterStatusAgenteNf = (empresaId) => api.get(`${base(empresaId)}/agente/status`);

export const obterDetalheNotaFiscal = (empresaId, id) => api.get(`${base(empresaId)}/${id}`);

export const obterUrlXmlNotaFiscal = (empresaId, id) => api.get(`${base(empresaId)}/${id}/xml-url`);

export const aprovarNotaFiscal = (empresaId, id) => api.post(`${base(empresaId)}/${id}/aprovar`);

export const rejeitarNotaFiscal = (empresaId, id, motivoRejeicao) => api.post(`${base(empresaId)}/${id}/rejeitar`, { motivoRejeicao });

export const obterConfiguracaoLancamentosNf = (empresaId) => api.get(`${base(empresaId)}/configuracao-lancamentos`);

export const salvarConfiguracaoLancamentosNf = (empresaId, dados) => api.put(`${base(empresaId)}/configuracao-lancamentos`, dados);

export const gerarTokenAgenteNf = (empresaId) => api.post(`${base(empresaId)}/agente/token`);

export const revogarTokenAgenteNf = (empresaId) => api.post(`${base(empresaId)}/agente/token/revogar`);

export const obterUrlDownloadAgenteNf = (empresaId) => api.get(`${base(empresaId)}/agente/download`);

export const listarApuracaoTributaria = (empresaId, dataInicio, dataFim) =>
  api.get(`${base(empresaId)}/apuracao-tributaria?dataInicio=${dataInicio}&dataFim=${dataFim}`);
