import { api } from './api';

// contadorId/empresaId só fazem sentido pra SUPER_ADMIN (filtra carteira/empresa
// específica); contador/empresário vendo a própria equipe não precisam passar nada.
export const listarUsuarios = ({ contadorId, empresaId, plataforma } = {}) => {
  const parametros = new URLSearchParams();
  if (contadorId) parametros.set('contadorId', contadorId);
  if (empresaId) parametros.set('empresaId', empresaId);
  if (plataforma) parametros.set('plataforma', 'true');
  const query = parametros.toString();
  return api.get(query ? `/auth/usuarios?${query}` : '/auth/usuarios');
};

export const criarUsuario = (dados) => api.post('/auth/usuarios', dados);
export const bloquearUsuario = (id, motivo) => api.post(`/auth/usuarios/${id}/bloquear`, { motivo });
export const desbloquearUsuario = (id) => api.post(`/auth/usuarios/${id}/desbloquear`);
/** Reemite o link de acesso de um usuário que já existe (nunca recebeu o convite, perdeu, etc). */
export const gerarLinkAcesso = (id) => api.post(`/auth/usuarios/${id}/link-acesso`);
export const atualizarEmailUsuario = (id, novoEmail) => api.patch(`/auth/usuarios/${id}/email`, { novoEmail });
export const atualizarSenhaUsuario = (id, novaSenha) => api.patch(`/auth/usuarios/${id}/senha`, { novaSenha });
export const listarPermissoesUsuario = (id) => api.get(`/auth/usuarios/${id}/permissoes`);
/** Catálogo completo (todos os recursos/ações), sem filtrar por teto de nenhum papel -- usado por "Editar plano" (permissoesPadrao). */
export const listarCatalogoPermissoes = () => api.get('/auth/permissoes-catalogo');
export const concederPermissao = (id, permissaoId) => api.put(`/auth/usuarios/${id}/permissoes/${permissaoId}`);
export const revogarPermissao = (id, permissaoId) => api.delete(`/auth/usuarios/${id}/permissoes/${permissaoId}`);
