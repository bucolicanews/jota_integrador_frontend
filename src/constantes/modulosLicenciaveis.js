// Mesmo catálogo de MODULOS_LICENCIAVEIS do backend (src/pacotes-modulos/dominio/pacote-modulos.ts)
// -- compartilhado entre AdminPacotes.tsx e AdminPlanos.tsx (antes duplicado em cada arquivo).
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
