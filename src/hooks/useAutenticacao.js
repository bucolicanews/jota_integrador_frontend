import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from '../servicos/supabase';
import { api } from '../servicos/api';
import { definirMfaPendente, definirUsuario, limparUsuario, marcarPrecisaDefinirSenha } from '../store/autenticacaoSlice';

/** Monta o usuário autenticado a partir da sessão do Supabase Auth (app_metadata = claims sincronizados pelo backend). */
function mapearSessaoParaUsuario(session) {
  if (!session) return null;
  const metadata = session.user.app_metadata ?? {};
  return {
    id: session.user.id,
    email: session.user.email,
    papel: metadata.papel ?? null,
    escopo: metadata.escopo ?? null,
    contadorId: metadata.contador_id ?? null,
    empresaId: metadata.empresa_id ?? null,
    metodo2fa: metadata.metodo_2fa ?? 'nenhum',
  };
}

/**
 * 2FA é opcional, escolha do próprio usuário (docs/SEGURANCA.md do backend, atualização
 * 2026-11-09 -- deixou de ser obrigatório fixo por escopo) -- isto aqui é só UX (decidir
 * pra onde redirecionar quando falta completar o desafio); o backend SEMPRE revalida de
 * novo em cada request (SupabaseAuthGuard), nunca confia neste resultado.
 */
async function resolverMfaPendente(usuario) {
  if (usuario?.metodo2fa === 'totp') {
    const { data: nivel } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return nivel?.currentLevel === 'aal2' ? 'nenhum' : 'desafio';
  }

  if (usuario?.metodo2fa === 'email') {
    try {
      const status = await api.get('/auth/me/2fa');
      return status.precisaVerificar ? 'desafio' : 'nenhum';
    } catch {
      // Falha de rede não deve travar o usuário fora do app -- o backend revalida de
      // qualquer forma em toda outra rota (SupabaseAuthGuard), isto é só UX.
      return 'nenhum';
    }
  }

  return 'nenhum';
}

/** Mantém o Redux sincronizado com a sessão do Supabase Auth -- login, logout, refresh de token. */
export function useAutenticacao() {
  const dispatch = useDispatch();
  const { usuario, carregando, precisaDefinirSenha, mfaPendente } = useSelector((state) => state.autenticacao);

  useEffect(() => {
    async function sincronizar(session) {
      const usuarioMapeado = mapearSessaoParaUsuario(session);
      if (usuarioMapeado) {
        dispatch(definirUsuario(usuarioMapeado));
        dispatch(definirMfaPendente(await resolverMfaPendente(usuarioMapeado)));
      } else {
        dispatch(limparUsuario());
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => sincronizar(session));

    const { data: assinatura } = supabase.auth.onAuthStateChange((evento, session) => {
      sincronizar(session);

      // Link de acesso (tipo `recovery`, ver auth.controller.ts/gerar-link-acesso) --
      // marca pra RotaProtegida forçar /definir-senha antes de deixar entrar em qualquer
      // outra tela, senão a sessão fica "logada" sem nunca ter senha definida.
      if (evento === 'PASSWORD_RECOVERY') dispatch(marcarPrecisaDefinirSenha());
    });

    return () => assinatura.subscription.unsubscribe();
  }, [dispatch]);

  return { usuario, carregando, precisaDefinirSenha, mfaPendente };
}
