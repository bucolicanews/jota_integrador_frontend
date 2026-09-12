interface PlanoContaResumo {
  id: string;
  contaPaiId: string | null;
}

/** Nível de indentação de uma conta, andando por `contaPaiId` até a raiz. Reusado por todos os relatórios que mostram hierarquia (Balancete, Balanço, DRE, Razão). */
export function calcularNivel(contaId: string, mapaContas: Map<string, PlanoContaResumo>): number {
  let nivel = 1;
  let atualId: string | null = contaId;
  const visitados = new Set<string>();
  while (atualId && !visitados.has(atualId)) {
    visitados.add(atualId);
    const atual = mapaContas.get(atualId);
    if (!atual?.contaPaiId) break;
    nivel += 1;
    atualId = atual.contaPaiId;
  }
  return nivel;
}

