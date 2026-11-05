import { api } from './api';

export const obterComissaoHonorarios = () => api.get('/configuracoes-plataforma/comissao-honorarios');
export const atualizarComissaoHonorarios = (comissaoHonorariosPct) =>
  api.patch('/configuracoes-plataforma/comissao-honorarios', { comissaoHonorariosPct });

export const obterConfiguracaoPagbank = () => api.get('/configuracoes-plataforma/pagbank');
export const atualizarConfiguracaoPagbank = (dados) => api.patch('/configuracoes-plataforma/pagbank', dados);

// Comissão sobre link de pagamento PagBank de parcela de Contas a Receber (contrato) --
// separada da comissão de honorários.
export const obterComissaoContratos = () => api.get('/configuracoes-plataforma/comissao-contratos');
export const atualizarComissaoContratos = (comissaoContratosPct) =>
  api.patch('/configuracoes-plataforma/comissao-contratos', { comissaoContratosPct });
