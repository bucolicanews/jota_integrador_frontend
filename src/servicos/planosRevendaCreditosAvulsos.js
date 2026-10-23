import { api } from './api';

// "Plano de revenda" do contador pra crédito avulso -- mesmo conceito de
// planosRevendaPacote.js (módulos) e assinatura.js (créditos recorrentes), aqui pra
// pacotes de top-up pontual. Contador define o próprio preço de venda (margem sobre o
// repasse da plataforma); empresa compra esse pacote do contador (com split) em vez do
// pacote direto da plataforma.
export const listarPlanosRevendaCreditosAvulsos = (contadorId) =>
  api.get(`/contadores/${contadorId}/planos-revenda-creditos-avulsos`);
export const criarPlanoRevendaCreditoAvulso = (contadorId, { pacoteId, nome, valorVenda }) =>
  api.post(`/contadores/${contadorId}/planos-revenda-creditos-avulsos`, { pacoteId, nome, valorVenda });
export const atualizarPlanoRevendaCreditoAvulso = (contadorId, id, dados) =>
  api.patch(`/contadores/${contadorId}/planos-revenda-creditos-avulsos/${id}`, dados);
