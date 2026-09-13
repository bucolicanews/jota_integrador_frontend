import { api } from './api';

// contadorId/empresaId só fazem sentido pra SUPER_ADMIN (filtra carteira/empresa
// específica); contador/empresário vendo a própria equipe não precisam passar nada.
export const listarUsuarios = ({ contadorId, empresaId } = {}) => {
  const parametros = new URLSearchParams();
  if (contadorId) parametros.set('contadorId', contadorId);
  if (empresaId) parametros.set('empresaId', empresaId);
  const query = parametros.toString();
  return api.get(query ? `/auth/usuarios?${query}` : '/auth/usuarios');
};

export const criarUsuario = (dados) => api.post('/auth/usuarios', dados);
export const bloquearUsuario = (id, motivo) => api.post(`/auth/usuarios/${id}/bloquear`, { motivo });
export const desbloquearUsuario = (id) => api.post(`/auth/usuarios/${id}/desbloquear`);
export const listarPermissoesUsuario = (id) => api.get(`/auth/usuarios/${id}/permissoes`);
export const concederPermissao = (id, permissaoId) => api.put(`/auth/usuarios/${id}/permissoes/${permissaoId}`);
export const revogarPermissao = (id, permissaoId) => api.delete(`/auth/usuarios/${id}/permissoes/${permissaoId}`);
