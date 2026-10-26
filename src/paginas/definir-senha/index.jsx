import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { supabase } from '../../servicos/supabase';
import { limparPrecisaDefinirSenha } from '../../store/autenticacaoSlice';

/**
 * Primeiro acesso (ou recuperação) via link gerado em GerenciarUsuarios/contabil-empresas
 * (ver POST /auth/usuarios e /auth/usuarios/:id/link-acesso, sempre tipo `recovery` --
 * RotaProtegida força essa tela antes de deixar entrar em qualquer outra, ver
 * useAutenticacao.js/PASSWORD_RECOVERY).
 */
export default function DefinirSenha() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { novaSenha: '', confirmarSenha: '' } });
  const [erro, setErro] = useState(null);

  async function aoEnviar(dados) {
    setErro(null);
    if (dados.novaSenha !== dados.confirmarSenha) {
      setErro('As senhas não conferem.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: dados.novaSenha });
    if (error) {
      setErro(error.message);
      return;
    }
    dispatch(limparPrecisaDefinirSenha());
    navigate('/painel', { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow"
      >
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Defina sua senha</h1>
        <p className="mb-6 text-sm text-gray-500">Crie uma senha de acesso pra entrar nas próximas vezes.</p>

        <form onSubmit={handleSubmit(aoEnviar)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nova senha</label>
            <input
              type="password"
              placeholder="Mínimo 12 caracteres, com maiúscula, número e símbolo"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register('novaSenha', { required: true, minLength: 12 })}
            />
            {errors.novaSenha && <p className="mt-1 text-xs text-red-600">Mínimo 12 caracteres.</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Confirmar nova senha</label>
            <input
              type="password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register('confirmarSenha', { required: true })}
            />
            {errors.confirmarSenha && <p className="mt-1 text-xs text-red-600">Obrigatório.</p>}
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Definir senha e entrar'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
