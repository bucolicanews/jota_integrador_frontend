import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { supabase } from '../../servicos/supabase';
import { api } from '../../servicos/api';
import { definirMfaPendente, limparUsuario } from '../../store/autenticacaoSlice';

/**
 * Desafio de 2FA da sessão atual -- RotaProtegida força esta tela quando o usuário
 * escolheu um método (TOTP ou email) e ainda não completou o desafio nesta sessão (ver
 * useAutenticacao.js). TOTP: challenge+verify sempre direto no client (`supabase.auth.mfa`),
 * o Supabase já eleva a sessão pra aal2 ao verificar. Email: Supabase não tem esse
 * fator nativo, então challenge+verify passam pelo backend (POST /auth/me/2fa/email/...).
 */
export default function VerificarMfa() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const usuario = useSelector((state) => state.autenticacao.usuario);
  const metodo = usuario?.metodo2fa;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const [factorId, setFactorId] = useState(null);
  const [challengeId, setChallengeId] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (metodo === 'totp') {
      iniciarDesafioTotp();
    } else if (metodo === 'email') {
      enviarCodigoEmail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metodo]);

  async function iniciarDesafioTotp() {
    const { data: fatores, error: erroFatores } = await supabase.auth.mfa.listFactors();
    const fatorVerificado = fatores?.totp?.find((fator) => fator.status === 'verified');

    if (erroFatores || !fatorVerificado) {
      setErro('Nenhum fator TOTP verificado encontrado -- acesse Meu Perfil pra reconfigurar.');
      setCarregando(false);
      return;
    }

    const { data, error } = await supabase.auth.mfa.challenge({ factorId: fatorVerificado.id });
    if (error) {
      setErro('Falha ao iniciar o desafio: ' + error.message);
    } else {
      setFactorId(fatorVerificado.id);
      setChallengeId(data.id);
    }
    setCarregando(false);
  }

  async function enviarCodigoEmail() {
    try {
      await api.post('/auth/me/2fa/email/enviar-codigo');
    } catch (err) {
      setErro(err.message ?? 'Falha ao enviar o código por email');
    } finally {
      setCarregando(false);
    }
  }

  async function aoEnviarTotp(dados) {
    setErro(null);
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code: dados.codigo });
    if (error) {
      setErro('Código inválido ou expirado -- tente de novo.');
      return;
    }
    dispatch(definirMfaPendente('nenhum'));
    navigate('/painel', { replace: true });
  }

  async function aoEnviarEmail(dados) {
    setErro(null);
    try {
      await api.post('/auth/me/2fa/email/verificar', { codigo: dados.codigo });
    } catch (err) {
      setErro(err.message ?? 'Código inválido ou expirado -- tente de novo.');
      return;
    }
    dispatch(definirMfaPendente('nenhum'));
    navigate('/painel', { replace: true });
  }

  async function sair() {
    await supabase.auth.signOut();
    dispatch(limparUsuario());
    navigate('/login', { replace: true });
  }

  const pronto = metodo === 'totp' ? !!challengeId : !carregando && !erro;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow"
      >
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Confirme sua identidade</h1>
        <p className="mb-6 text-sm text-gray-500">
          {metodo === 'email' ? 'Informe o código enviado para seu email.' : 'Informe o código do seu app autenticador.'}
        </p>

        {carregando && <p className="text-sm text-gray-500">{metodo === 'email' ? 'Enviando código...' : 'Preparando desafio...'}</p>}

        {pronto && (
          <form onSubmit={handleSubmit(metodo === 'email' ? aoEnviarEmail : aoEnviarTotp)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Código de 6 dígitos</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-widest focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                {...register('codigo', { required: true, minLength: 6, maxLength: 6 })}
              />
              {errors.codigo && <p className="mt-1 text-xs text-red-600">Informe os 6 dígitos do código.</p>}
            </div>

            {erro && <p className="text-sm text-red-600">{erro}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Verificando...' : 'Confirmar e entrar'}
            </button>

            {metodo === 'email' && (
              <button type="button" onClick={enviarCodigoEmail} className="w-full text-center text-xs text-primary hover:underline">
                Reenviar código
              </button>
            )}
          </form>
        )}

        {erro && !pronto && <p className="text-sm text-red-600">{erro}</p>}

        <button type="button" onClick={sair} className="mt-4 w-full text-center text-xs text-gray-400 hover:text-gray-600">
          Sair
        </button>
      </motion.div>
    </div>
  );
}
