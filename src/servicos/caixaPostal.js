import { api } from './api';

export const listarMensagensCaixaPostal = (empresaId) => api.get(`/empresas/${empresaId}/caixa-postal`);
export const sincronizarCaixaPostal = (empresaId) => api.post(`/empresas/${empresaId}/caixa-postal/sincronizar`);
export const obterDetalheMensagem = (empresaId, mensagemId) =>
  api.get(`/empresas/${empresaId}/caixa-postal/mensagens/${mensagemId}`);
export const marcarMensagemComoLida = (empresaId, mensagemId) =>
  api.post(`/empresas/${empresaId}/caixa-postal/mensagens/${mensagemId}/marcar-lida`);
