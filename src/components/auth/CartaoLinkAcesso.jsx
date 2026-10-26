import { useState } from 'react';

/**
 * Mostra um link de acesso gerado (POST /auth/usuarios ou /auth/usuarios/:id/link-acesso)
 * com botão de copiar -- a garantia real de acesso, já que o convite automático por
 * e-mail é melhor-esforço (depende de SMTP configurado, nem sempre está).
 */
export default function CartaoLinkAcesso({ link, titulo = 'Link de acesso gerado' }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
      <p className="mb-1 text-xs font-medium text-blue-800">{titulo}</p>
      <p className="mb-2 text-xs text-blue-700">
        Também disparamos um e-mail automático, mas copie e envie este link por garantia (WhatsApp, e-mail manual) --
        ele expira em algumas horas e só funciona uma vez.
      </p>
      <div className="flex gap-2">
        <input readOnly value={link} onClick={(e) => e.target.select()} className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700" />
        <button
          type="button"
          onClick={copiar}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          {copiado ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
    </div>
  );
}
