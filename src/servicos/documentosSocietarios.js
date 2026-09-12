import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/documentos-societarios`;

export const listarModelosSocietarios = (empresaId) => api.get(`${base(empresaId)}/modelos`);
export const obterModeloSocietario = (empresaId, id) => api.get(`${base(empresaId)}/modelos/${id}`);
export const criarModeloSocietario = (empresaId, dados) => api.post(`${base(empresaId)}/modelos`, dados);
export const atualizarModeloSocietario = (empresaId, id, dados) => api.patch(`${base(empresaId)}/modelos/${id}`, dados);
export const excluirModeloSocietario = (empresaId, id) => api.delete(`${base(empresaId)}/modelos/${id}`);

export const listarBlocosSocietarios = (empresaId) => api.get(`${base(empresaId)}/blocos`);
export const criarBlocoSocietario = (empresaId, dados) => api.post(`${base(empresaId)}/blocos`, dados);
export const atualizarBlocoSocietario = (empresaId, id, dados) => api.patch(`${base(empresaId)}/blocos/${id}`, dados);
export const excluirBlocoSocietario = (empresaId, id) => api.delete(`${base(empresaId)}/blocos/${id}`);

export const listarDocumentosSocietarios = (empresaId, status) => api.get(`${base(empresaId)}${status ? `?status=${status}` : ''}`);
export const obterDocumentoSocietario = (empresaId, id) => api.get(`${base(empresaId)}/${id}`);
export const criarDocumentoSocietario = (empresaId, dados) => api.post(base(empresaId), dados);
export const atualizarDocumentoSocietario = (empresaId, id, dados) => api.patch(`${base(empresaId)}/${id}`, dados);
export const excluirDocumentoSocietario = (empresaId, id) => api.delete(`${base(empresaId)}/${id}`);
export const finalizarDocumentoSocietario = (empresaId, id) => api.post(`${base(empresaId)}/${id}/finalizar`);
export const arquivarDocumentoSocietario = (empresaId, id) => api.post(`${base(empresaId)}/${id}/arquivar`);
