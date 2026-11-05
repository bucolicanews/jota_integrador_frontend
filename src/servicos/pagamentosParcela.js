import { api } from './api';

const base = (empresaId, parcelaId) => `/empresas/${empresaId}/contas-a-receber/parcelas/${parcelaId}/link-pagamento`;

export const gerarLinkPagamento = (empresaId, parcelaId, dados) => api.post(base(empresaId, parcelaId), dados);

export const listarLinksPagamento = (empresaId, parcelaId) => api.get(base(empresaId, parcelaId));
