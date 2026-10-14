import { api } from './api';

export const obterComissaoHonorarios = () => api.get('/configuracoes-plataforma/comissao-honorarios');
export const atualizarComissaoHonorarios = (comissaoHonorariosPct) =>
  api.patch('/configuracoes-plataforma/comissao-honorarios', { comissaoHonorariosPct });

export const obterConfiguracaoPagbank = () => api.get('/configuracoes-plataforma/pagbank');
export const atualizarConfiguracaoPagbank = (dados) => api.patch('/configuracoes-plataforma/pagbank', dados);
