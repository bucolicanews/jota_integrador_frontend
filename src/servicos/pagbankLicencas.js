import { api } from './api';

export const obterStatusPagbankConta = (contadorId) => api.get(`/contadores/${contadorId}/pagbank-conta/status`);
export const atualizarPagbankConta = (contadorId, pagbankAccountId) =>
  api.patch(`/contadores/${contadorId}/pagbank-conta`, { pagbankAccountId });

export const iniciarPagamentoAtivacao = (contadorId, licencaId, dados) =>
  api.post(`/contadores/${contadorId}/licencas-modulo/${licencaId}/iniciar-pagamento`, dados);

export const listarPendenciasAtivacao = (empresaId) => api.get(`/empresas/${empresaId}/pagamentos-ativacao-licenca`);
