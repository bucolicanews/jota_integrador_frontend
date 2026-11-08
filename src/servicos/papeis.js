import { api } from './api';

// Papel deixou de ser um catálogo fixo (2026-11-08) -- vem do backend (tabela `papeis`),
// os 7 de sistema (sistema=true) convivem com os customizados criados em /admin/papeis.
export const listarPapeis = () => api.get('/auth/papeis');
export const obterPermissoesDoPapel = (id) => api.get(`/auth/papeis/${id}/permissoes`);
export const criarPapel = (dados) => api.post('/auth/papeis', dados);
export const atualizarPapel = (id, dados) => api.put(`/auth/papeis/${id}`, dados);
