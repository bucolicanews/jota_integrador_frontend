import { api } from './api';

function montarQuery(params = {}) {
  const query = new URLSearchParams();
  if (params.usuarioId) query.set('usuarioId', params.usuarioId);
  if (params.ano) query.set('ano', params.ano);
  if (params.mes) query.set('mes', params.mes);
  const texto = query.toString();
  return texto ? `?${texto}` : '';
}

export const registrarBatida = ({ selfie, latitude, longitude }) => {
  const formData = new FormData();
  formData.append('selfie', selfie);
  if (latitude != null) formData.append('latitude', String(latitude));
  if (longitude != null) formData.append('longitude', String(longitude));
  return api.postFormData('/ponto-eletronico/batidas', formData);
};

export const listarRegistros = (params) => api.get(`/ponto-eletronico/registros${montarQuery(params)}`);

export const obterResumoMensal = (params) => api.get(`/ponto-eletronico/resumo${montarQuery(params)}`);

export const lancarFaltaOuAbono = ({ usuarioAlvoId, data, horasFalta, horasAbono, atestado }) => {
  const formData = new FormData();
  formData.append('usuarioAlvoId', usuarioAlvoId);
  formData.append('data', data);
  formData.append('horasFalta', String(horasFalta));
  formData.append('horasAbono', String(horasAbono));
  if (atestado) formData.append('atestado', atestado);
  return api.postFormData('/ponto-eletronico/falta-abono', formData);
};

export const lancarFolgaTrabalhada = (dados) => api.post('/ponto-eletronico/folga-trabalhada', dados);

export const ajustarRegistrosDoDia = (usuarioAlvoId, data, batidas) =>
  api.put(`/ponto-eletronico/dias/${usuarioAlvoId}/${data}`, { batidas });

export const excluirRegistro = (id) => api.delete(`/ponto-eletronico/registros/${id}`);

export const obterConfiguracaoFuncionario = (usuarioAlvoId) => api.get(`/ponto-eletronico/configuracao/${usuarioAlvoId}`);

export const atualizarConfiguracaoFuncionario = (usuarioAlvoId, dados) => api.put(`/ponto-eletronico/configuracao/${usuarioAlvoId}`, dados);

export const listarFerias = (usuarioId) => api.get(`/ponto-eletronico/ferias${usuarioId ? `?usuarioId=${usuarioId}` : ''}`);

export const criarFerias = (dados) => api.post('/ponto-eletronico/ferias', dados);

export const cancelarFerias = (id) => api.delete(`/ponto-eletronico/ferias/${id}`);

export const obterUrlSelfie = (registroId) => api.get(`/ponto-eletronico/registros/${registroId}/selfie-url`);

export const obterUrlAtestado = (registroId) => api.get(`/ponto-eletronico/registros/${registroId}/atestado-url`);
