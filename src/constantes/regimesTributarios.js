// Nomenclatura alinhada com os serviços do SERPRO/Integra Contador (MEI tem serviços
// próprios -- CCMEI/PGMEI -- separados do Simples Nacional "regular" -- PGDAS-D/DEFIS).
// Precisa bater exatamente com `REGIMES_TRIBUTARIOS` de jota_integrador/src/empresas/dominio/empresa.ts.
export const REGIMES_TRIBUTARIOS = [
  { valor: 'simples_nacional', rotulo: 'Simples Nacional' },
  { valor: 'mei', rotulo: 'MEI (Microempreendedor Individual)' },
  { valor: 'lucro_presumido', rotulo: 'Lucro Presumido' },
  { valor: 'lucro_real', rotulo: 'Lucro Real' },
  { valor: 'lucro_arbitrado', rotulo: 'Lucro Arbitrado' },
];
