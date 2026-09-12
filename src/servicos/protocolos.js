import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/protocolos`;

export const listarProtocolos = (empresaId, status) => api.get(`${base(empresaId)}${status ? `?status=${status}` : ''}`);

export const obterProtocolo = (empresaId, id) => api.get(`${base(empresaId)}/${id}`);

export const criarProtocolo = (empresaId, { clienteId, titulo, descricao, linkTarefa, anexos }) => {
  const formData = new FormData();
  formData.append('clienteId', clienteId);
  formData.append('titulo', titulo);
  if (descricao) formData.append('descricao', descricao);
  if (linkTarefa) formData.append('linkTarefa', linkTarefa);
  (anexos ?? []).forEach((arquivo) => formData.append('anexos', arquivo));
  return api.postFormData(base(empresaId), formData);
};

export const atualizarProtocolo = (empresaId, id, dados) => api.patch(`${base(empresaId)}/${id}`, dados);

export const avancarStatusProtocolo = (empresaId, id, status) => api.patch(`${base(empresaId)}/${id}/avancar-status`, { status });

export const registrarEntregaProtocolo = (empresaId, id, { nomeRespRecebimento, dataRecebimento, foto }) => {
  const formData = new FormData();
  formData.append('nomeRespRecebimento', nomeRespRecebimento);
  formData.append('dataRecebimento', dataRecebimento);
  formData.append('foto', foto);
  return api.postFormData(`${base(empresaId)}/${id}/entrega`, formData);
};

export const cancelarOuMarcarProblema = (empresaId, id, status, observacao) => api.post(`${base(empresaId)}/${id}/cancelar`, { status, observacao });

export const excluirProtocolo = (empresaId, id) => api.delete(`${base(empresaId)}/${id}`);

export const obterUrlAnexo = (empresaId, protocoloId, anexoId) => api.get(`${base(empresaId)}/${protocoloId}/anexos/${anexoId}/url`);

export const obterUrlFotoEntrega = (empresaId, protocoloId) => api.get(`${base(empresaId)}/${protocoloId}/foto-entrega/url`);
