import { api } from './api';

const base = (contadorId) => `/contadores/${contadorId}/licencas-modulo`;

export const listarLicencasModulo = (contadorId) => api.get(base(contadorId));

export const iniciarCheckoutLicenca = (contadorId, { pacoteId, successUrl, cancelUrl }) =>
  api.post(`${base(contadorId)}/checkout`, { pacoteId, successUrl, cancelUrl });

export const ativarLicenca = (contadorId, licencaId, { empresaId, valorCobrado, parcelamento }) =>
  api.post(`${base(contadorId)}/${licencaId}/ativar`, { empresaId, valorCobrado, parcelamento });

export const desativarLicenca = (contadorId, licencaId) => api.post(`${base(contadorId)}/${licencaId}/desativar`);

// Self-service da empresa: licenças do PRÓPRIO contador já compradas no atacado e com
// plano de revenda ativo -- ela ativa sozinha pagando, sem esperar o contador clicar
// "ativar numa empresa" (ver LicencasModuloEmpresaController no backend).
export const listarLicencasDisponiveisParaEmpresa = (empresaId) => api.get(`/empresas/${empresaId}/licencas-modulo/disponiveis`);
export const iniciarPagamentoAtivacaoEmpresa = (empresaId, licencaId, { metodo, customerEmail, customerTelefoneE164 }) =>
  api.post(`/empresas/${empresaId}/licencas-modulo/${licencaId}/iniciar-pagamento`, { metodo, customerEmail, customerTelefoneE164 });
