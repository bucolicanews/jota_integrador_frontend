import { api } from './api';

// contadorId só é necessário quando quem chama tem papel de plataforma (SUPER_ADMIN etc.)
// consultando a carteira de UM contador específico -- contador vendo a própria carteira não precisa.
export const listarEmpresas = (contadorId) =>
  api.get(contadorId ? `/empresas?contadorId=${contadorId}` : '/empresas');
export const obterEmpresa = (id) => api.get(`/empresas/${id}`);
// Workspace fixo de quem não navega por carteira (plataforma ou contador dono/operador) --
// sem parâmetros, o backend resolve pelo papel/vínculo do token.
export const obterEmpresaInterna = () => api.get('/empresas/interna');
export const criarEmpresa = (dados) => api.post('/empresas', dados);
export const atualizarEmpresa = (id, dados) => api.patch(`/empresas/${id}`, dados);
// Correção pontual de CNPJ errado -- endpoint separado de propósito (ação sensível, só
// admin/contador da carteira, sempre auditada no backend).
export const corrigirCnpjEmpresa = (id, cnpj) => api.patch(`/empresas/${id}/cnpj`, { cnpj });
// Mover empresa pra outra carteira -- só SUPER_ADMIN, sempre auditada no backend.
export const transferirCarteiraEmpresa = (id, contadorId) => api.patch(`/empresas/${id}/contador`, { contadorId });
export const atualizarModoAcessoSerpro = (id, modoAcessoSerpro) =>
  api.patch(`/empresas/${id}/modo-acesso-serpro`, { modoAcessoSerpro });
export const bloquearEmpresa = (id, motivo) => api.post(`/empresas/${id}/bloquear`, { motivo });
export const desbloquearEmpresa = (id) => api.post(`/empresas/${id}/desbloquear`);
