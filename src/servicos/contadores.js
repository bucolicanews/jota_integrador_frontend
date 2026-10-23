import { api } from './api';

export const listarContadores = () => api.get('/contadores');
export const obterContador = (id) => api.get(`/contadores/${id}`);
// Workspace do próprio contador logado -- backend resolve pelo vínculo do token, sem precisar do id.
export const obterMeuContador = () => api.get('/contadores/me');
export const criarContador = (dados) => api.post('/contadores', dados);
export const atualizarContador = (id, dados) => api.patch(`/contadores/${id}`, dados);
// Correção pontual de CPF/CNPJ errado -- endpoint separado de propósito (ação sensível,
// só admin ou o próprio contador, sempre auditada no backend).
export const corrigirCnpjCpfContador = (id, cnpjCpf) => api.patch(`/contadores/${id}/cnpj-cpf`, { cnpjCpf });
export const bloquearContador = (id, motivo) => api.post(`/contadores/${id}/bloquear`, { motivo });
export const desbloquearContador = (id) => api.post(`/contadores/${id}/desbloquear`);
// Exclusão definitiva -- só funciona se o contador não tiver nenhum rastro de uso real
// (carteira vazia, sem login, sem assinatura/crédito/consulta) -- backend bloqueia com
// 409 e uma lista do que resolver antes, senão.
export const deletarContador = (id) => api.delete(`/contadores/${id}`);
