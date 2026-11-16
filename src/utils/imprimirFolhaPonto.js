const ROTULO_OBSERVACAO_PADRAO = { falta: 'Falta Injustificada', abono: 'Abono', compensacao: 'Compensação', extra100: 'Extra 100%' };

function formatarMinutos(minutos) {
  const sinal = minutos < 0 ? '-' : '';
  const absolutos = Math.abs(minutos);
  const horas = Math.floor(absolutos / 60);
  const mins = absolutos % 60;
  return `${sinal}${horas}h ${String(mins).padStart(2, '0')}m`;
}

/** Mesmo agrupamento por dia da tela (DetalheFolhaPonto.tsx) -- 1º/2º período, observação,
 * total do dia -- pra impresso e tela nunca mostrarem formatos diferentes. */
function agruparPorDia(registros) {
  const porDia = {};
  for (const r of registros) {
    const dia = r.horarioRegistro.slice(0, 10);
    if (!porDia[dia]) porDia[dia] = [];
    porDia[dia].push(r);
  }
  return porDia;
}

function periodosDoDia(registrosDoDia) {
  const batidas = registrosDoDia
    .filter((r) => r.tipo === 'entrada' || r.tipo === 'saida')
    .sort((a, b) => new Date(a.horarioRegistro).getTime() - new Date(b.horarioRegistro).getTime());
  const hora = (r) => (r ? new Date(r.horarioRegistro).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--');
  return { e1: hora(batidas[0]), s1: hora(batidas[1]), e2: hora(batidas[2]), s2: hora(batidas[3]) };
}

function observacaoPrincipal(registrosDoDia) {
  const registro = registrosDoDia.find((r) => r.tipo === 'falta' || r.tipo === 'abono' || r.tipo === 'compensacao' || r.tipo === 'extra100');
  if (!registro) return '--';
  return registro.observacao || ROTULO_OBSERVACAO_PADRAO[registro.tipo] || registro.tipo;
}

function minutosTrabalhadosNoDia(registrosDoDia) {
  const batidas = registrosDoDia
    .filter((r) => r.tipo === 'entrada' || r.tipo === 'saida')
    .sort((a, b) => new Date(a.horarioRegistro).getTime() - new Date(b.horarioRegistro).getTime());
  let minutos = 0;
  for (let i = 0; i + 1 < batidas.length; i += 2) {
    if (batidas[i].tipo === 'entrada' && batidas[i + 1].tipo === 'saida') {
      minutos += (new Date(batidas[i + 1].horarioRegistro).getTime() - new Date(batidas[i].horarioRegistro).getTime()) / 60_000;
    }
  }
  for (const r of registrosDoDia) {
    if (r.tipo === 'abono' || r.tipo === 'compensacao' || r.tipo === 'extra100') minutos += r.minutosCredito ?? 0;
  }
  return Math.round(minutos);
}

const NOME_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Documento A4 formal (letterhead, tabela com cabeçalho cinza, linhas de assinatura) --
 * mesmo template de impressão já validado no jotaCaixa (use-print.ts), não a lista crua
 * de registros de antes. 100% client-side, abre janela nova e chama window.print(). */
export function imprimirFolhaPonto({ funcionario, ano, mes, registros, resumo }) {
  const porDia = agruparPorDia(registros);
  const diasOrdenados = Object.keys(porDia).sort();
  const competencia = `${NOME_MES[mes - 1]}/${ano}`;

  const linhas = diasOrdenados
    .map((dia) => {
      const registrosDoDia = porDia[dia];
      const { e1, s1, e2, s2 } = periodosDoDia(registrosDoDia);
      const dataFormatada = new Date(`${dia}T00:00:00`).toLocaleDateString('pt-BR');
      return `<tr>
        <td>${dataFormatada}</td>
        <td style="text-align:center">${e1}</td>
        <td style="text-align:center">${s1}</td>
        <td style="text-align:center">${e2}</td>
        <td style="text-align:center">${s2}</td>
        <td style="text-align:right">${formatarMinutos(minutosTrabalhadosNoDia(registrosDoDia))}</td>
        <td>${observacaoPrincipal(registrosDoDia)}</td>
      </tr>`;
    })
    .join('');

  const isExtra = resumo.saldoMinutos >= 0;

  const htmlContent = `<!DOCTYPE html><html><head><title>Folha de Ponto - ${funcionario.nome}</title>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #000; font-size: 10pt; }
  h1, h2 { margin: 0; page-break-after: avoid; }
  .cabecalho { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
  .cabecalho h1 { font-size: 16px; font-weight: bold; }
  .cabecalho p { margin: 2px 0 0; font-size: 10px; color: #555; }
  .secao { margin-bottom: 15px; page-break-inside: avoid; }
  .secao h2 { font-size: 13px; font-weight: bold; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; font-size: 9pt; word-wrap: break-word; }
  th { background-color: #f0f0f0; font-weight: bold; }
  .assinaturas { display: flex; justify-content: space-around; margin-top: 50px; page-break-before: avoid; }
  .linha-assinatura { width: 42%; border-top: 1px solid #000; padding-top: 5px; text-align: center; font-size: 9pt; }
  @media print {
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }
  }
</style>
</head><body>
  <div class="cabecalho">
    <h1>FOLHA DE PONTO MENSAL</h1>
    <p>Funcionário: ${funcionario.nome}${funcionario.email ? ` -- ${funcionario.email}` : ''}</p>
    <p>Competência: ${competencia}</p>
  </div>

  <div class="secao">
    <h2>Resumo da Jornada</h2>
    <table style="width: 60%">
      <tbody>
        <tr><th style="width: 50%">Jornada mensal</th><td>${formatarMinutos(resumo.jornadaMinutos)}</td></tr>
        <tr><th>Horas trabalhadas</th><td>${formatarMinutos(resumo.trabalhadoMinutos)}</td></tr>
        <tr><th>Saldo</th><td style="color:${isExtra ? 'green' : 'red'}">${formatarMinutos(resumo.saldoMinutos)}</td></tr>
        <tr><th>Extra 100%</th><td>${formatarMinutos(resumo.extra100Minutos)}</td></tr>
        <tr><th>Faltas injustificadas</th><td>${resumo.diasComFaltaInjustificada}</td></tr>
        <tr><th>Férias (dias)</th><td>${resumo.diasFerias}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="secao">
    <h2>Detalhe Diário</h2>
    <table>
      <thead>
        <tr>
          <th rowspan="2" style="width: 12%">Data</th>
          <th colspan="2" style="width: 24%; text-align:center">1º Período</th>
          <th colspan="2" style="width: 24%; text-align:center">2º Período</th>
          <th rowspan="2" style="width: 12%">Total</th>
          <th rowspan="2" style="width: 28%">Observação</th>
        </tr>
        <tr>
          <th style="text-align:center">Entrada</th>
          <th style="text-align:center">Saída</th>
          <th style="text-align:center">Entrada</th>
          <th style="text-align:center">Saída</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
  </div>

  <div class="assinaturas">
    <div class="linha-assinatura">Assinatura do Funcionário</div>
    <div class="linha-assinatura">Assinatura do Empregador</div>
  </div>
</body></html>`;

  const janela = window.open('', '_blank', 'width=900,height=700');
  if (!janela) return false;
  janela.document.write(htmlContent);
  janela.document.close();
  setTimeout(() => {
    try {
      janela.focus();
      janela.print();
    } catch {
      // impressão cancelada pelo usuário -- não é erro
    }
  }, 500);
  return true;
}
