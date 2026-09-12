import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/contratos`;

export const listarModelosContrato = (empresaId) => api.get(`${base(empresaId)}/modelos`);
export const obterModeloContrato = (empresaId, id) => api.get(`${base(empresaId)}/modelos/${id}`);
export const criarModeloContrato = (empresaId, dados) => api.post(`${base(empresaId)}/modelos`, dados);
export const atualizarModeloContrato = (empresaId, id, dados) => api.patch(`${base(empresaId)}/modelos/${id}`, dados);
export const excluirModeloContrato = (empresaId, id) => api.delete(`${base(empresaId)}/modelos/${id}`);

export const obterCatalogoTags = (empresaId) => api.get(`${base(empresaId)}/tags`);

export const obterConfiguracaoContratos = (empresaId) => api.get(`${base(empresaId)}/configuracao`);
export const salvarConfiguracaoContratos = (empresaId, dados) => api.put(`${base(empresaId)}/configuracao`, dados);

export const preVisualizarContrato = (empresaId, dados) => api.post(`${base(empresaId)}/preview`, dados);

export const listarContratos = (empresaId, status) => api.get(`${base(empresaId)}${status ? `?status=${status}` : ''}`);
export const obterContrato = (empresaId, id) => api.get(`${base(empresaId)}/${id}`);
export const criarContrato = (empresaId, dados) => api.post(base(empresaId), dados);
export const atualizarContrato = (empresaId, id, dados) => api.patch(`${base(empresaId)}/${id}`, dados);
export const excluirContrato = (empresaId, id) => api.delete(`${base(empresaId)}/${id}`);

export const bloquearContrato = (empresaId, id) => api.post(`${base(empresaId)}/${id}/bloquear`);
export const desbloquearContrato = (empresaId, id) => api.post(`${base(empresaId)}/${id}/desbloquear`);

export const registrarAditivo = (empresaId, id, dados) => api.post(`${base(empresaId)}/${id}/aditivos`, dados);

export const gerarLinkAssinatura = (empresaId, id) => api.post(`${base(empresaId)}/${id}/link-assinatura`);

export const obterUrlSelfie = (empresaId, id) => api.get(`${base(empresaId)}/${id}/selfie-url`);

// Superfície PÚBLICA -- sem empresaId, busca só por token opaco. Usada pela página de
// assinatura (/assinar-contrato/:token), que roda fora do login.
export const obterContratoPublico = (token) => api.get(`/assinatura-publica/${token}`);

export const assinarContratoPublico = (token, { nome, selfie }) => {
  const formData = new FormData();
  formData.append('nome', nome);
  formData.append('selfie', selfie);
  return api.postFormData(`/assinatura-publica/${token}/assinar`, formData);
};
