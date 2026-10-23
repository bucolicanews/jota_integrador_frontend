import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/das`;

export const listarDas = (empresaId) => api.get(base(empresaId));

export const obterUrlPdfDas = (empresaId, dasId) => api.get(`${base(empresaId)}/${dasId}/url`);

export const sincronizarDas = (empresaId) => api.post(`${base(empresaId)}/sincronizar`, {});

// Boleto real (código de barras), só Simples Nacional -- sempre gera de novo no SERPRO
// (valor muda com juros/multa se vencido), diferente de obterUrlPdfDas (o Extrato, cacheado).
// dataConsolidacao (AAAA-MM-DD, opcional) é até quando o boleto fica válido pra pagar --
// SERPRO exige estritamente futura.
export const gerarSegundaViaDas = (empresaId, dasId, dataConsolidacao) =>
  api.post(`${base(empresaId)}/${dasId}/segunda-via`, dataConsolidacao ? { dataConsolidacao } : {});
