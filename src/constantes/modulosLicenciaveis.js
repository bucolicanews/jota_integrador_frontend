// Mesmo catálogo de MODULOS_LICENCIAVEIS do backend (src/planos/dominio/plano.ts -- antes
// vivia em pacotes-modulos/, sistema eliminado em 2026-10-26). Usado em AdminPlanos.tsx
// (os módulos marcados no plano de crédito SERPRO liberam de verdade via assinatura ativa).
export const MODULOS_DISPONIVEIS = [
  { valor: 'contratos', rotulo: 'Contratos' },
  { valor: 'documentos_societarios', rotulo: 'Documentos Societários' },
  { valor: 'conciliacao_bancaria', rotulo: 'Conciliação Bancária' },
  { valor: 'protocolos', rotulo: 'Protocolos' },
  { valor: 'bancos', rotulo: 'Bancos' },
  { valor: 'relatorios', rotulo: 'Relatórios' },
  // Separado de "contabilidade" (núcleo, nunca entra aqui) -- cobre tudo que fala com
  // o SERPRO em nome da empresa: DAS, Caixa Postal, CCMEI, Procuração/Certificado.
  { valor: 'fiscal', rotulo: 'Fiscal' },
  // Só gate pra EMPRESARIO_DONO/OPERADOR_EMPRESA (visão empresa) -- contador/admin usam o
  // mesmo item de menu pro PRÓPRIO time, nunca depende de módulo de empresa-cliente nenhuma.
  { valor: 'ponto_eletronico', rotulo: 'Ponto Eletrônico' },
  { valor: 'usuarios', rotulo: 'Gerenciar Usuários' },
  { valor: 'clientes', rotulo: 'Clientes' },
  { valor: 'fornecedores', rotulo: 'Fornecedores' },
  { valor: 'historicos', rotulo: 'Históricos' },
  { valor: 'lancamentos', rotulo: 'Lançamentos' },
  { valor: 'contas_a_pagar', rotulo: 'Contas a Pagar' },
  { valor: 'contas_a_receber', rotulo: 'Contas a Receber' },
  { valor: 'plano_contas', rotulo: 'Plano de Contas' },
];
