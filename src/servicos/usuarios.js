import { api } from './api';

// contadorId só faz sentido pra SUPER_ADMIN (filtra carteira específica). empresaId
// filtra pra só a equipe de UMA empresa (cliente do contador, ou a própria do
// EMPRESARIO_DONO). somenteProprio filtra pra só a equipe do próprio escritório do
// contador (exclui a equipe de toda empresa-cliente) -- ignorado se empresaId vier junto.
export const listarUsuarios = ({ contadorId, empresaId, plataforma, somenteProprio } = {}) => {
  const parametros = new URLSearchParams();
  if (contadorId) parametros.set('contadorId', contadorId);
  if (empresaId) parametros.set('empresaId', empresaId);
  if (plataforma) parametros.set('plataforma', 'true');
  if (somenteProprio) parametros.set('somenteProprio', 'true');
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
export const atualizarNomeUsuario = (id, nome) => api.patch(`/auth/usuarios/${id}/nome`, { nome });
/** CONTADOR_DONO/EMPRESARIO_DONO só trocam papel dentro do próprio vínculo (backend nega mudar vínculo ou promover a dono); SUPER_ADMIN pode tudo. */
export const atualizarPapelUsuario = (id, papel, contadorId, empresaId) =>
  api.patch(`/auth/usuarios/${id}/papel`, { papel, contadorId, empresaId });
export const listarPermissoesUsuario = (id) => api.get(`/auth/usuarios/${id}/permissoes`);
/** Catálogo completo (todos os recursos/ações), sem filtrar por teto de nenhum papel -- usado por "Editar plano" (permissoesPadrao). */
export const listarCatalogoPermissoes = () => api.get('/auth/permissoes-catalogo');
export const concederPermissao = (id, permissaoId) => api.put(`/auth/usuarios/${id}/permissoes/${permissaoId}`);
export const revogarPermissao = (id, permissaoId) => api.delete(`/auth/usuarios/${id}/permissoes/${permissaoId}`);
