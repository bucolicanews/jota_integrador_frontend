// Catálogo oficial de sistemas do Integra Contador/SERPRO (nomes exatos do catálogo --
// ver https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/como_contratar/)
// -- mesma chave livre usada em consultas_serpro.id_sistema/custos_consultas_serpro.id_sistema
// no backend, sem FK/enum (novo sistema integrado não exige migration). Usado como opções
// de select onde o admin precisa escolher um id_sistema (ex: cota incluída no plano).
export const SISTEMAS_SERPRO = [
  'AUTENTICAPROCURADOR',
  'CAIXAPOSTAL',
  'CCMEI',
  'DCTFWEB',
  'DEFIS',
  'DTE',
  'E-PROCESSO',
  'EVENTOSATUALIZACAO',
  'MIT',
  'PAGTOWEB',
  'PARCMEI-ESP',
  'PARCMEI',
  'PARCSN-ESP',
  'PARCSN',
  'PERTMEI',
  'PERTSN',
  'PGDASD',
  'PGMEI',
  'PNRCONTADOR',
  'PROCURACOES',
  'REGIMEAPURACAO',
  'RELPMEI',
  'RELPSN',
  'SICALC',
  'SITFIS',
];
