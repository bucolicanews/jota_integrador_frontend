import { api } from './api';

export const listarPlanoContas = (empresaId) => api.get(`/empresas/${empresaId}/plano-contas`);
export const criarContaContabil = (empresaId, dados) => api.post(`/empresas/${empresaId}/plano-contas`, dados);
export const atualizarContaContabil = (empresaId, contaId, dados) =>
  api.patch(`/empresas/${empresaId}/plano-contas/${contaId}`, dados);
export const desativarContaContabil = (empresaId, contaId) =>
  api.post(`/empresas/${empresaId}/plano-contas/${contaId}/desativar`);
export const reativarContaContabil = (empresaId, contaId) =>
  api.post(`/empresas/${empresaId}/plano-contas/${contaId}/reativar`);

export const importarPlanoContas = (empresaId, arquivo) => {
  const formData = new FormData();
  formData.append('arquivo', arquivo);
  return api.postFormData(`/empresas/${empresaId}/plano-contas/importar`, formData);
};

export const exportarPlanoContas = (empresaId) => api.getArquivo(`/empresas/${empresaId}/plano-contas/exportar`);

export const listarModelosPlanoContas = () => api.get('/plano-contas-modelos');
export const baixarModeloPlanoContas = (modelo) => api.getArquivo(`/plano-contas-modelos/${modelo}/csv`);
