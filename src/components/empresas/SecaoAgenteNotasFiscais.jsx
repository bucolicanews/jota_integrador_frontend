import { useState } from 'react';
import { gerarTokenAgenteNf, obterUrlDownloadAgenteNf, revogarTokenAgenteNf } from '../../servicos/notasFiscais';
import { showError, showSuccess } from '../../utils/toast';

/**
 * Token do agente local (programa Python que varre as pastas de entrada/saída no PC do
 * contador/empresa e sobe os XML pra este endpoint) -- mostrado em claro só uma vez aqui,
 * depois disso só existe o hash no banco. Gerar um novo revoga o anterior automaticamente.
 */
export default function SecaoAgenteNotasFiscais({ empresaId }) {
  const [gerando, setGerando] = useState(false);
  const [revogando, setRevogando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [tokenGerado, setTokenGerado] = useState('');

  async function baixarAgente() {
    setBaixando(true);
    try {
      const { url } = await obterUrlDownloadAgenteNf(empresaId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (erro) {
      showError(erro.message ?? 'Não foi possível baixar o agente');
    } finally {
      setBaixando(false);
    }
  }

  async function gerar() {
    if (tokenGerado && !window.confirm('Gerar um novo token revoga o atual -- o agente instalado com o token antigo para de funcionar. Continuar?')) {
      return;
    }
    setGerando(true);
    try {
      const { token } = await gerarTokenAgenteNf(empresaId);
      setTokenGerado(token);
      showSuccess('Token gerado -- copie agora, ele não aparece de novo.');
    } catch (erro) {
      showError(erro.message);
    } finally {
      setGerando(false);
    }
  }

  async function revogar() {
    if (!window.confirm('Revogar o token do agente? Ele para de conseguir enviar notas fiscais até você gerar um novo.')) return;
    setRevogando(true);
    try {
      await revogarTokenAgenteNf(empresaId);
      setTokenGerado('');
      showSuccess('Token revogado.');
    } catch (erro) {
      showError(erro.message);
    } finally {
      setRevogando(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Baixe o agente local e instale na máquina onde o emissor de nota salva os XML (pode ser o PC do contador ou da empresa-cliente).
        Rode <code>python gui.py</code>, cole o token gerado abaixo, escolha as pastas de entrada/saída e clique "Ligar" -- ele passa a
        enviar as notas novas automaticamente.
      </p>

      <button
        type="button"
        onClick={baixarAgente}
        disabled={baixando}
        className="rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
      >
        {baixando ? 'Gerando link...' : 'Baixar agente (.zip)'}
      </button>

      {tokenGerado && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="mb-1 text-xs font-medium text-amber-800">Copie agora -- este token não aparece de novo:</p>
          <code className="block select-all break-all rounded bg-white px-2 py-1 text-xs">{tokenGerado}</code>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={gerar}
          disabled={gerando}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {gerando ? 'Gerando...' : tokenGerado ? 'Gerar novo token' : 'Gerar token do agente'}
        </button>
        <button
          type="button"
          onClick={revogar}
          disabled={revogando}
          className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {revogando ? 'Revogando...' : 'Revogar token'}
        </button>
      </div>
    </div>
  );
}
