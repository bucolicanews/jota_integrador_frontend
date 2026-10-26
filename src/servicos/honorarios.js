import { api } from './api';

export const listarHonorariosDoContador = (contadorId) => api.get(`/contadores/${contadorId}/honorarios`);

export const criarCobrancaHonorario = (
  contadorId,
  empresaId,
  { descricao, valor, metodo, cardEncrypted, installments, customerEmail, customerTelefoneE164 },
) =>
  api.post(`/contadores/${contadorId}/empresas/${empresaId}/honorarios`, {
    descricao,
    valor,
    metodo,
    cardEncrypted,
    installments,
    customerEmail,
    customerTelefoneE164,
  });
