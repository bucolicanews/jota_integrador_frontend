import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from '../servicos/supabase';
import { definirUsuario, limparUsuario } from '../store/autenticacaoSlice';

/** Monta o usuário autenticado a partir da sessão do Supabase Auth (app_metadata = claims sincronizados pelo backend). */
function mapearSessaoParaUsuario(session) {
  if (!session) return null;
  const metadata = session.user.app_metadata ?? {};
  return {
    id: session.user.id,
    email: session.user.email,
    papel: metadata.papel ?? null,
    contadorId: metadata.contador_id ?? null,
    empresaId: metadata.empresa_id ?? null,
  };
}

/** Mantém o Redux sincronizado com a sessão do Supabase Auth -- login, logout, refresh de token. */
export function useAutenticacao() {
  const dispatch = useDispatch();
  const { usuario, carregando } = useSelector((state) => state.autenticacao);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const usuarioMapeado = mapearSessaoParaUsuario(session);
      if (usuarioMapeado) dispatch(definirUsuario(usuarioMapeado));
      else dispatch(limparUsuario());
    });

    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, session) => {
      const usuarioMapeado = mapearSessaoParaUsuario(session);
      if (usuarioMapeado) dispatch(definirUsuario(usuarioMapeado));
      else dispatch(limparUsuario());
    });

    return () => assinatura.subscription.unsubscribe();
  }, [dispatch]);

  return { usuario, carregando };
}
