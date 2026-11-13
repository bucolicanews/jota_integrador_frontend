import { api } from './api';

const base = (empresaId) => `/empresas/${empresaId}/tarefas`;

// Quadros (N por empresa) -------------------------------------------------
export const listarQuadros = (empresaId) => api.get(`${base(empresaId)}/quadros`);
export const criarQuadro = (empresaId, nome) => api.post(`${base(empresaId)}/quadros`, { nome });
export const atualizarQuadro = (empresaId, quadroId, nome) => api.patch(`${base(empresaId)}/quadros/${quadroId}`, { nome });
export const excluirQuadro = (empresaId, quadroId) => api.delete(`${base(empresaId)}/quadros/${quadroId}`);

// Colunas -------------------------------------------------------------------
export const criarColuna = (empresaId, quadroId, nome, ehFinal) =>
  api.post(`${base(empresaId)}/quadros/${quadroId}/colunas`, { nome, ehFinal });
export const atualizarColuna = (empresaId, quadroId, colunaId, dados) =>
  api.patch(`${base(empresaId)}/quadros/${quadroId}/colunas/${colunaId}`, dados);
export const reordenarColunas = (empresaId, quadroId, colunaIds) =>
  api.put(`${base(empresaId)}/quadros/${quadroId}/colunas/reordenar`, { colunaIds });
export const excluirColuna = (empresaId, quadroId, colunaId) =>
  api.delete(`${base(empresaId)}/quadros/${quadroId}/colunas/${colunaId}`);

// Tarefas ---------------------------------------------------------------
export const listarTarefas = (empresaId) => api.get(base(empresaId));
export const criarTarefa = (empresaId, dados) => api.post(base(empresaId), dados);
export const atualizarTarefa = (empresaId, id, dados) => api.patch(`${base(empresaId)}/${id}`, dados);
/** `quadroId` nunca é enviado -- backend deriva da `colunaId` (Zero Trust). */
export const moverTarefa = (empresaId, id, colunaId, ordem, responsavelId) =>
  api.patch(`${base(empresaId)}/${id}/mover`, { colunaId, ordem, responsavelId });
export const excluirTarefa = (empresaId, id) => api.delete(`${base(empresaId)}/${id}`);
export const listarHistoricoTarefa = (empresaId, id) => api.get(`${base(empresaId)}/${id}/historico`);
export const listarFeedTarefas = (empresaId) => api.get(`${base(empresaId)}/feed`);

// Comentários -------------------------------------------------------------
export const listarComentariosTarefa = (empresaId, id) => api.get(`${base(empresaId)}/${id}/comentarios`);
export const criarComentarioTarefa = (empresaId, id, corpo) => api.post(`${base(empresaId)}/${id}/comentarios`, { corpo });
export const atualizarComentarioTarefa = (empresaId, id, comentarioId, corpo) =>
  api.patch(`${base(empresaId)}/${id}/comentarios/${comentarioId}`, { corpo });
export const excluirComentarioTarefa = (empresaId, id, comentarioId) =>
  api.delete(`${base(empresaId)}/${id}/comentarios/${comentarioId}`);

// Equipe (fila de candidatos a receber a tarefa) --------------------------
export const listarEquipeTarefa = (empresaId, id) => api.get(`${base(empresaId)}/${id}/equipe`);
export const adicionarMembroEquipe = (empresaId, id, usuarioId) => api.post(`${base(empresaId)}/${id}/equipe`, { usuarioId });
export const removerMembroEquipe = (empresaId, id, usuarioId) => api.delete(`${base(empresaId)}/${id}/equipe/${usuarioId}`);

// Anexos ------------------------------------------------------------------
export const adicionarAnexoTarefa = (empresaId, id, arquivo) => {
  const formData = new FormData();
  formData.append('arquivo', arquivo);
  return api.postFormData(`${base(empresaId)}/${id}/anexos`, formData);
};
export const listarAnexosTarefa = (empresaId, id) => api.get(`${base(empresaId)}/${id}/anexos`);
export const obterUrlAnexoTarefa = (empresaId, id, anexoId) => api.get(`${base(empresaId)}/${id}/anexos/${anexoId}/url`);
