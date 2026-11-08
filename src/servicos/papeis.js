import { api } from './api';

// Papel deixou de ser um catálogo fixo (2026-11-08) -- vem do backend (tabela `papeis`),
// os 7 de sistema (sistema=true) convivem com os customizados criados em /admin/papeis.
// empresaId (só CONTADOR_DONO usa) -- "listar como se eu estivesse agindo em nome desta
// empresa-cliente da minha carteira" (posse confirmada no backend).
export const listarPapeis = (empresaId) => api.get(empresaId ? `/auth/papeis?empresaId=${empresaId}` : '/auth/papeis');
export const obterPermissoesDoPapel = (id) => api.get(`/auth/papeis/${id}/permissoes`);
export const criarPapel = (dados) => api.post('/auth/papeis', dados);
export const atualizarPapel = (id, dados) => api.put(`/auth/papeis/${id}`, dados);
