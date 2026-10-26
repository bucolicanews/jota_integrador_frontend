import { api } from './api';

// Top-up pontual de créditos SERPRO. Dois caminhos (ver IniciarCompraCreditoAvulsoUseCase
// no backend): pacote direto da plataforma -- a própria empresa compra pra si mesma, ou o
// contador dela compra em nome dela, sempre 100% pra plataforma (sem split); ou pacote de
// revenda de um contador específico -- só a própria empresa compra, com split.
export const listarPacotesCreditosAvulsos = () => api.get('/pacotes-creditos-avulsos');
export const criarPacoteCreditoAvulso = (dados) => api.post('/pacotes-creditos-avulsos', dados);
export const atualizarPacoteCreditoAvulso = (id, dados) => api.patch(`/pacotes-creditos-avulsos/${id}`, dados);

/** Catálogo de pacotes de revenda ATIVOS do próprio contador da empresa -- pra ela escolher comprar dele (com split) em vez do pacote direto da plataforma. */
export const listarPacotesRevendaDisponiveis = (empresaId) => api.get(`/empresas/${empresaId}/creditos-avulsos/planos-revenda`);

// Base pra compra em quantidade livre (quantidade * valorPorCredito) -- leitura pública, escrita só admin.
export const obterConfiguracaoCreditosAvulsos = () => api.get('/pacotes-creditos-avulsos/configuracao');
export const atualizarValorPorCredito = (valorPorCredito) => api.patch('/pacotes-creditos-avulsos/configuracao', { valorPorCredito });

export const comprarCreditoAvulso = (
  empresaId,
  { pacoteId, planoRevendaId, quantidade, metodo, cardEncrypted, installments, customerEmail, customerTelefoneE164 },
) =>
  api.post(`/empresas/${empresaId}/creditos-avulsos/comprar`, {
    pacoteId,
    planoRevendaId,
    quantidade,
    metodo,
    cardEncrypted,
    installments,
    customerEmail,
    customerTelefoneE164,
  });
