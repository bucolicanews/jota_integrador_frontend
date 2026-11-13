import { api } from './api';

/** `atualizar=true` força nova consulta ao SERPRO (gasta crédito); sem isso, serve o PDF já salvo. */
export const obterUrlCcmei = (empresaId, atualizar = false) =>
  api.get(`/empresas/${empresaId}/serpro/ccmei/url${atualizar ? '?atualizar=true' : ''}`);
