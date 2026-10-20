/** Limiar de aviso antecipado -- mesmo espírito do alerta 60/30/15/7 dias já descrito
 * pro Modo A (docs/SEGURANCA.md §1), simplificado pra um único limiar de banner. */
const DIAS_AVISO_PROXIMO = 30;

/**
 * 'ok' | 'proximo' (vence em até DIAS_AVISO_PROXIMO dias) | 'vencido' -- nunca é lido do
 * backend (StatusCertificado.expirado nunca é setado automaticamente lá), sempre
 * calculado aqui em cima de `validadeFim`, pra sempre refletir a data real de agora.
 */
export function statusExpiracaoCertificado(validadeFim, hoje = new Date()) {
  if (!validadeFim) return 'ok';
  const fim = new Date(validadeFim);
  const diasRestantes = Math.ceil((fim - hoje) / (1000 * 60 * 60 * 24));
  if (diasRestantes < 0) return 'vencido';
  if (diasRestantes <= DIAS_AVISO_PROXIMO) return 'proximo';
  return 'ok';
}

export function diasRestantesCertificado(validadeFim, hoje = new Date()) {
  if (!validadeFim) return null;
  const fim = new Date(validadeFim);
  return Math.ceil((fim - hoje) / (1000 * 60 * 60 * 24));
}
