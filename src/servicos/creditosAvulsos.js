import { api } from './api';

// Top-up pontual de créditos SERPRO -- a própria empresa compra pra si mesma, ou o
// contador dela compra em nome dela, sempre 100% pra plataforma (sem split).
export const listarPacotesCreditosAvulsos = () => api.get('/pacotes-creditos-avulsos');
export const criarPacoteCreditoAvulso = (dados) => api.post('/pacotes-creditos-avulsos', dados);
export const atualizarPacoteCreditoAvulso = (id, dados) => api.patch(`/pacotes-creditos-avulsos/${id}`, dados);

export const comprarCreditoAvulso = (empresaId, { pacoteId, customerEmail, customerTelefoneE164 }) =>
  api.post(`/empresas/${empresaId}/creditos-avulsos/comprar`, { pacoteId, customerEmail, customerTelefoneE164 });
