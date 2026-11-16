import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/das`;

export const listarDas = (empresaId) => api.get(base(empresaId));

export const obterUrlPdfDas = (empresaId, dasId) => api.get(`${base(empresaId)}/${dasId}/url`);

// Recibo de entrega da declaração, só Simples Nacional -- cacheado no sync (nunca
// gasta crédito ao clicar, igual obterUrlPdfDas). 404 se o sync ainda não trouxe o
// recibo dessa competência (ver docs do backend: shape de CONSDECREC15 não confirmado).
export const obterUrlReciboDas = (empresaId, dasId) => api.get(`${base(empresaId)}/${dasId}/recibo-url`);

// Declaração (Programa Gerador do DAS -- Declaratório), mesma chamada CONSDECREC15
// do recibo -- mesmo padrão de cache/404 de obterUrlReciboDas.
export const obterUrlDeclaracaoDas = (empresaId, dasId) => api.get(`${base(empresaId)}/${dasId}/declaracao-url`);

// filtro = { competenciaInicio, competenciaFim } (AAAA-MM-DD, opcional) -- sem os dois, backend usa a janela padrão de 3 meses.
export const sincronizarDas = (empresaId, filtro = {}) => api.post(`${base(empresaId)}/sincronizar`, filtro);

export const estimarSincronizacaoDas = (empresaId, filtro = {}) => {
  const query = new URLSearchParams();
  if (filtro.competenciaInicio) query.set('competenciaInicio', filtro.competenciaInicio);
  if (filtro.competenciaFim) query.set('competenciaFim', filtro.competenciaFim);
  const qs = query.toString();
  return api.get(`${base(empresaId)}/sincronizar/estimativa${qs ? `?${qs}` : ''}`);
};

// Boleto real (código de barras), só Simples Nacional -- sempre gera de novo no SERPRO
// (valor muda com juros/multa se vencido), diferente de obterUrlPdfDas (o Extrato, cacheado).
// dataConsolidacao (AAAA-MM-DD, opcional) é até quando o boleto fica válido pra pagar --
// SERPRO exige estritamente futura.
export const gerarSegundaViaDas = (empresaId, dasId, dataConsolidacao) =>
  api.post(`${base(empresaId)}/${dasId}/segunda-via`, dataConsolidacao ? { dataConsolidacao } : {});

export const obterConfiguracaoLancamentosDas = (empresaId) => api.get(`${base(empresaId)}/configuracao-lancamentos`);

export const salvarConfiguracaoLancamentosDas = (empresaId, dados) => api.put(`${base(empresaId)}/configuracao-lancamentos`, dados);

export const listarPendenciasBaixaDas = (empresaId) => api.get(`${base(empresaId)}/pendencias-baixa`);

export const baixarDas = (empresaId, dasId, dados) => api.post(`${base(empresaId)}/${dasId}/baixa`, dados);

// Gatilho manual pra gerar a provisão de um DAS que ficou sem lançamento (geralmente porque a config não existia na hora do sync) -- nunca chama SERPRO, zero crédito.
export const gerarProvisaoDas = (empresaId, dasId) => api.post(`${base(empresaId)}/${dasId}/provisao`);

// Transmite a declaração PGDAS-D real pro SERPRO (TRANSDECLARACAO11) e encadeia a
// geração do DAS -- AÇÃO IRREVERSÍVEL (declaração fiscal real, só desfaz com
// retificação formal). competencia no formato AAAA-MM-01.
export const transmitirDeclaracaoPgdasd = (empresaId, competencia, dados = {}) =>
  api.post(`${base(empresaId)}/${competencia}/transmitir-declaracao`, dados);
