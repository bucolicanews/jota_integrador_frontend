import { Eye, EyeOff } from 'lucide-react';

// Botão de "olhinho" pra mostrar/ocultar senha -- usado em todo input de senha
// do app. Fica dentro de um wrapper `relative` que envolve só o <input> (nunca
// o label/erro junto), senão a centralização vertical quebra em campo com label.
export default function PasswordToggleButton({ visible, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
    >
      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}
