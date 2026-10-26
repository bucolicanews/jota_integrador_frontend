import { api } from './api';

export const obterStatusPagbankConta = (contadorId) => api.get(`/contadores/${contadorId}/pagbank-conta/status`);
export const atualizarPagbankConta = (contadorId, pagbankAccountId) =>
  api.patch(`/contadores/${contadorId}/pagbank-conta`, { pagbankAccountId });
