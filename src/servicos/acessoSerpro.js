import { api } from './api';

// Procuração (Modo A)
export const obterProcuracao = (empresaId) => api.get(`/empresas/${empresaId}/procuracao`);
export const atualizarStatusProcuracao = (empresaId, dados) =>
  api.patch(`/empresas/${empresaId}/procuracao`, dados);

// Certificado (Modo B) -- metadados só (arquivo/senha nunca voltam da API, docs/SEGURANCA.md)
export const listarCertificados = (empresaId) => api.get(`/empresas/${empresaId}/certificado`);
export const revogarCertificado = (empresaId) => api.post(`/empresas/${empresaId}/certificado/revogar`);

/** Cadastro/rotação -- multipart (arquivo binário do certificado + campos de texto). */
export function cadastrarOuRotacionarCertificado(empresaId, { arquivo, tipo, senha, validadeInicio, validadeFim }) {
  const formData = new FormData();
  formData.append('arquivo', arquivo);
  formData.append('tipo', tipo);
  formData.append('senha', senha);
  if (validadeInicio) formData.append('validadeInicio', validadeInicio);
  formData.append('validadeFim', validadeFim);
  return api.postFormData(`/empresas/${empresaId}/certificado`, formData);
}
