import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { supabase } from '../../servicos/supabase';
import { api } from '../../servicos/api';
import { definirMfaPendente } from '../../store/autenticacaoSlice';

/**
 * Cadastro VOLUNTÁRIO do método 'app autenticador' (TOTP) -- acessado só pelo botão em
 * Meu Perfil, nunca forçado por rota (2FA é opcional pra qualquer papel, ver
 * useAutenticacao.js). Enroll+verify são sempre direto no client (`supabase.auth.mfa`,
 * mesma regra de ouro do login) -- o backend só confirma depois
 * (POST /auth/me/2fa/totp/confirmar), revalidando via admin API antes de passar a
 * exigir TOTP.
 */
export default function ConfigurarMfa() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const [fator, setFator] = useState(null); // { id, qrCode, secret }
  const [erro, setErro] = useState(null);
  const [carregandoEnroll, setCarregandoEnroll] = useState(true);

  useEffect(() => {
    supabase.auth.mfa.enroll({ factorType: 'totp' }).then(({ data, error }) => {
      if (error) {
        setErro('Falha ao iniciar o cadastro: ' + error.message);
      } else {
        setFator({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      }
      setCarregandoEnroll(false);
    });
  }, []);

  async function aoEnviar(dados) {
    setErro(null);
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: fator.id,
      code: dados.codigo,
    });

    if (error) {
      setErro('Código inválido ou expirado -- confira o relógio do celular e tente de novo.');
      return;
    }

    await api.post('/auth/me/2fa/totp/confirmar', { factorId: data.id ?? fator.id });

    dispatch(definirMfaPendente('nenhum'));
    navigate('/perfil', { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow"
      >
        <h1 className="mb-1 text-xl font-semibold text-gray-900">Configurar app autenticador</h1>
        <p className="mb-6 text-sm text-gray-500">
          Escaneie o QR code com um app autenticador (Google Authenticator, Authy, etc) e confirme o código.
        </p>

        {carregandoEnroll && <p className="text-sm text-gray-500">Gerando QR code...</p>}

        {fator && (
          <>
            <div className="mb-4 flex justify-center">
              <img src={fator.qrCode} alt="QR code do autenticador" className="h-40 w-40" />
            </div>
            <p className="mb-4 break-all text-center text-xs text-gray-400">
              Não consegue escanear? Cadastre manualmente: {fator.secret}
            </p>

            <form onSubmit={handleSubmit(aoEnviar)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Código de 6 dígitos</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-widest focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  {...register('codigo', { required: true, minLength: 6, maxLength: 6 })}
                />
                {errors.codigo && <p className="mt-1 text-xs text-red-600">Informe os 6 dígitos do app.</p>}
              </div>

              {erro && <p className="text-sm text-red-600">{erro}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Confirmando...' : 'Confirmar'}
              </button>
            </form>
          </>
        )}

        {erro && !fator && <p className="text-sm text-red-600">{erro}</p>}

        <button type="button" onClick={() => navigate('/perfil')} className="mt-4 w-full text-center text-xs text-gray-400 hover:text-gray-600">
          Cancelar
        </button>
      </motion.div>
    </div>
  );
}
