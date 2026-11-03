import { api } from './api';

// Créditos SERPRO são por EMPRESA-CLIENTE (não mais por contador), mudança de 2026-10-14.
export const obterSaldoCreditos = (empresaId) => api.get(`/empresas/${empresaId}/creditos/saldo`);

/** Nome do evento global pra avisar o indicador de saldo no Header (ele não refaz fetch sozinho ao navegar). */
export const EVENTO_SALDO_CREDITOS_ATUALIZADO = 'saldo-creditos-atualizado';

/** Chame depois de qualquer ação que gaste/credite crédito, pra o Header atualizar o saldo na hora. */
export const notificarSaldoCreditosAtualizado = () => window.dispatchEvent(new Event(EVENTO_SALDO_CREDITOS_ATUALIZADO));

/**
 * Mede o saldo antes/depois de uma ação que gasta crédito (ex: consultar o SERPRO) e
 * avisa o Header pra atualizar na hora. Nunca mostrar `gasto` pro papel de empresário --
 * docs/UX-UI.md: custo por operação é granularidade só do contador, pro empresário é só
 * "operações fiscais incluídas no plano".
 */
export async function executarComAvisoDeCredito(empresaId, acaoAsync) {
  const { saldo: saldoAntes } = await obterSaldoCreditos(empresaId);
  const resultado = await acaoAsync();
  const { saldo: saldoDepois } = await obterSaldoCreditos(empresaId);
  notificarSaldoCreditosAtualizado();
  return { resultado, gasto: saldoAntes - saldoDepois, saldo: saldoDepois };
}

export const listarMovimentosCreditos = (empresaId) => api.get(`/empresas/${empresaId}/creditos/movimentos`);
export const creditarManualmente = (empresaId, { quantidade, motivo }) =>
  api.post(`/empresas/${empresaId}/creditos/creditar`, { quantidade, motivo });
export const debitarManualmente = (empresaId, { quantidade, motivo }) =>
  api.post(`/empresas/${empresaId}/creditos/debitar`, { quantidade, motivo });
