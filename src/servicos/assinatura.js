import { api } from './api';

// Assinatura de créditos SERPRO é por EMPRESA-CLIENTE agora (mudança de 2026-10-14) --
// Stripe/checkout/faturas removidos, pagamento passou a ser PIX com split PagBank
// (mesmo mecanismo de licencasModulo.js).
export const listarPlanos = () => api.get('/planos');
export const obterAssinatura = (contadorId, empresaId) =>
  api.get(`/contadores/${contadorId}/empresas/${empresaId}/assinatura`);
export const ativarAssinaturaManual = (contadorId, empresaId, { planoId, planoRevendaId }) =>
  api.post(`/contadores/${contadorId}/empresas/${empresaId}/assinatura/ativar-manual`, { planoId, planoRevendaId });
export const bloquearAssinatura = (contadorId, empresaId) =>
  api.post(`/contadores/${contadorId}/empresas/${empresaId}/assinatura/bloquear`);
export const cancelarAssinatura = (contadorId, empresaId) =>
  api.post(`/contadores/${contadorId}/empresas/${empresaId}/assinatura/cancelar`);
export const atualizarVencimentoAssinatura = (contadorId, empresaId, fimEm) =>
  api.patch(`/contadores/${contadorId}/empresas/${empresaId}/assinatura/vencimento`, { fimEm });
export const iniciarPagamentoAssinatura = (
  contadorId,
  empresaId,
  { planoId, metodo, cardEncrypted, installments, customerEmail, customerTelefoneE164 },
) =>
  api.post(`/contadores/${contadorId}/empresas/${empresaId}/assinatura/iniciar-pagamento`, {
    planoId,
    metodo,
    cardEncrypted,
    installments,
    customerEmail,
    customerTelefoneE164,
  });

export const listarPlanosRevendaCreditos = (contadorId) => api.get(`/contadores/${contadorId}/planos-revenda-creditos`);
export const criarPlanoRevendaCredito = (contadorId, { planoId, nome, valorVenda }) =>
  api.post(`/contadores/${contadorId}/planos-revenda-creditos`, { planoId, nome, valorVenda });
export const atualizarPlanoRevendaCredito = (contadorId, id, dados) =>
  api.patch(`/contadores/${contadorId}/planos-revenda-creditos/${id}`, dados);

// Self-service da empresa: ela assina o plano de revenda do PRÓPRIO contador sozinha
// (resolve contadorId internamente) -- sem esperar ele iniciar a cobrança (ver
// AssinaturaEmpresaController no backend).
export const obterMinhaAssinatura = (empresaId) => api.get(`/empresas/${empresaId}/assinatura`);
export const obterMeuPagamentoPendente = (empresaId) => api.get(`/empresas/${empresaId}/assinatura/pagamento-pendente`);
export const listarMeusPlanosRevendaCreditos = (empresaId) => api.get(`/empresas/${empresaId}/assinatura/planos-revenda`);
export const iniciarMinhaAssinatura = (empresaId, { planoId, metodo, cardEncrypted, installments, customerEmail, customerTelefoneE164 }) =>
  api.post(`/empresas/${empresaId}/assinatura/iniciar-pagamento`, {
    planoId,
    metodo,
    cardEncrypted,
    installments,
    customerEmail,
    customerTelefoneE164,
  });
