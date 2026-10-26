import { api } from './api';

// Chave pública (RSA) pra criptografar cartão no navegador antes de mandar pro backend
// (PagSeguro.encryptCard() -- ver FormularioCheckoutPagbank). É literalmente pública,
// qualquer usuário autenticado pode pedir.
export const obterChavePublicaCartao = () => api.get('/pagbank/chave-publica-cartao');
