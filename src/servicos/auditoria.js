import { api } from './api';

export function listarLogsAuditoria({ recurso, acao, limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (recurso) params.set('recurso', recurso);
  if (acao) params.set('acao', acao);
  params.set('limit', limit);
  params.set('offset', offset);
  return api.get(`/logs-auditoria?${params.toString()}`);
}
