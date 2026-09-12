// Mirror do common/tags/renderizar-tags.ts do backend -- usado só pro preview client-side
// de Documentos Societários (que não tem endpoint de preview dedicado, diferente de
// Contratos). Regra de domínio pura sem estado, duplicar é mais simples que criar uma
// chamada de rede só pra isso.
export function renderizarTags(template, valores) {
  return template.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (correspondencia, nomeTag) => {
    const valor = valores[nomeTag];
    return valor !== undefined ? valor : correspondencia;
  });
}

export function extrairTagsDoTemplate(template) {
  const encontradas = new Set();
  const regex = /\{\{\s*([A-Z0-9_]+)\s*\}\}/g;
  let correspondencia;
  while ((correspondencia = regex.exec(template)) !== null) {
    encontradas.add(correspondencia[1]);
  }
  return [...encontradas];
}
