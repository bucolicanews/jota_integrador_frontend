const ROTULO_TIPO = { entrada: 'Entrada', saida: 'Saída', falta: 'Falta', abono: 'Abono', compensacao: 'Compensação', extra100: 'Extra 100%' };

function formatarMinutos(minutos) {
  const sinal = minutos < 0 ? '-' : '';
  const absolutos = Math.abs(minutos);
  const horas = Math.floor(absolutos / 60);
  const mins = absolutos % 60;
  return `${sinal}${horas}h${String(mins).padStart(2, '0')}`;
}

/** 100% client-side (mesma técnica de DialogImprimirProtocolo/jotaCaixa) -- gera o HTML e chama window.print() numa janela nova. */
export function imprimirFolhaPonto({ funcionario, ano, mes, registros, resumo }) {
  const linhas = registros
    .map(
      (r) =>
        `<tr><td style="padding:1mm;border-bottom:1px solid #ccc">${new Date(r.horarioRegistro).toLocaleString('pt-BR')}</td><td style="padding:1mm;border-bottom:1px solid #ccc">${ROTULO_TIPO[r.tipo] ?? r.tipo}</td></tr>`,
    )
    .join('');

  const htmlContent = `<!DOCTYPE html><html><head><title>Folha de Ponto - ${funcionario.nome}</title>
    <style>@page { size: A4 portrait; margin: 10mm; } body { font-family: Arial, sans-serif; margin:0; padding:10mm; font-size:10pt; color:#000; } table { width:100%; border-collapse:collapse; } th { text-align:left; border-bottom:2px solid #000; padding:1mm; }</style>
    </head><body>
    <h2 style="margin:0 0 2mm">Folha de Ponto</h2>
    <p style="margin:0 0 1mm"><strong>${funcionario.nome}</strong> -- ${funcionario.email}</p>
    <p style="margin:0 0 4mm">Competência: ${String(mes).padStart(2, '0')}/${ano}</p>
    <table style="margin-bottom:4mm">
      <tr><td style="padding:1mm"><strong>Jornada:</strong> ${formatarMinutos(resumo.jornadaMinutos)}</td><td style="padding:1mm"><strong>Trabalhado:</strong> ${formatarMinutos(resumo.trabalhadoMinutos)}</td></tr>
      <tr><td style="padding:1mm"><strong>Saldo:</strong> ${formatarMinutos(resumo.saldoMinutos)}</td><td style="padding:1mm"><strong>Extra 100%:</strong> ${formatarMinutos(resumo.extra100Minutos)}</td></tr>
    </table>
    <table><thead><tr><th>Data/Hora</th><th>Tipo</th></tr></thead><tbody>${linhas}</tbody></table>
    </body></html>`;

  const janela = window.open('', '_blank', 'width=800,height=600');
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
