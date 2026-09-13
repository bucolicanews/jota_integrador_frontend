import { api } from './api';

function montarQuery(params = {}) {
  const query = new URLSearchParams();
  if (params.origem) query.set('origem', params.origem);
  if (params.contadorId) query.set('contadorId', params.contadorId);
  if (params.status) query.set('status', params.status);
  const texto = query.toString();
  return texto ? `?${texto}` : '';
}

export const listarTickets = (params) => api.get(`/suporte/tickets${montarQuery(params)}`);

export const obterResumoSuporte = (params) => api.get(`/suporte/resumo${montarQuery(params)}`);

export const obterTicket = (id) => api.get(`/suporte/tickets/${id}`);

export const criarTicket = ({ titulo, prioridade, mensagemInicial, ticketReferenciaId, anexo }) => {
  const formData = new FormData();
  formData.append('titulo', titulo);
  formData.append('prioridade', prioridade);
  formData.append('mensagemInicial', mensagemInicial);
  if (ticketReferenciaId) formData.append('ticketReferenciaId', ticketReferenciaId);
  if (anexo) formData.append('anexo', anexo);
  return api.postFormData('/suporte/tickets', formData);
};

export const atualizarStatusTicket = (id, status) => api.patch(`/suporte/tickets/${id}/status`, { status });

export const atualizarPrioridadeTicket = (id, prioridade) => api.patch(`/suporte/tickets/${id}/prioridade`, { prioridade });

export const excluirTicket = (id) => api.delete(`/suporte/tickets/${id}`);

export const listarMensagens = (ticketId) => api.get(`/suporte/tickets/${ticketId}/mensagens`);

export const enviarMensagem = (ticketId, { conteudo, anexo }) => {
  const formData = new FormData();
  formData.append('conteudo', conteudo);
  if (anexo) formData.append('anexo', anexo);
  return api.postFormData(`/suporte/tickets/${ticketId}/mensagens`, formData);
};

export const obterUrlAnexoMensagem = (ticketId, mensagemId) => api.get(`/suporte/tickets/${ticketId}/mensagens/${mensagemId}/anexo-url`);
