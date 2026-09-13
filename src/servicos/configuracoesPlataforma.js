import { api } from './api';

export const obterComissaoHonorarios = () => api.get('/configuracoes-plataforma/comissao-honorarios');
export const atualizarComissaoHonorarios = (comissaoHonorariosPct) =>
  api.patch('/configuracoes-plataforma/comissao-honorarios', { comissaoHonorariosPct });
