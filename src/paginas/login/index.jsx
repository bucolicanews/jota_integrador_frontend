import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { supabase } from '../../servicos/supabase';

export default function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const [erroLogin, setErroLogin] = useState(null);

  async function aoEnviar(dados) {
    setErroLogin(null);
    // Único lugar do app que fala com Supabase Auth direto -- login/sessão, nunca dado
    // de domínio (regra de ouro do CLAUDE.md deste repo).
    const { error } = await supabase.auth.signInWithPassword({
      email: dados.email,
      password: dados.senha,
    });

    if (error) {
      setErroLogin('E-mail ou senha inválidos.');
    }
    // Sucesso: onAuthStateChange (useAutenticacao) já atualiza o Redux e o App.jsx
    // redireciona automaticamente pro dashboard certo.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow"
      >
        <h1 className="mb-1 text-xl font-semibold text-gray-900">JOTA FISCAL</h1>
        <p className="mb-6 text-sm text-gray-500">Entre com sua conta</p>

        <form onSubmit={handleSubmit(aoEnviar)} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register('email', { required: true })}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">E-mail é obrigatório.</p>}
          </div>

          <div>
            <label htmlFor="senha" className="mb-1 block text-sm font-medium text-gray-700">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              {...register('senha', { required: true })}
            />
            {errors.senha && <p className="mt-1 text-xs text-red-600">Senha é obrigatória.</p>}
          </div>

          {erroLogin && <p className="text-sm text-red-600">{erroLogin}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
