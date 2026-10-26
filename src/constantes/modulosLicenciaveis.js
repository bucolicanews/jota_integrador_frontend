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
];
