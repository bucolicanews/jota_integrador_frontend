import { Navigate, useLocation } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';

export function RotaProtegida({ children }) {
  const { usuario, carregando, precisaDefinirSenha, mfaPendente } = useAutenticacao();
  const location = useLocation();

  if (carregando) {
    return <div className="flex h-screen items-center justify-center text-gray-500">Carregando...</div>;
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // Sessão veio de um link de acesso (ver useAutenticacao.js) -- trava em /definir-senha
  // até o usuário definir a própria senha, senão a sessão fica "logada" sem senha nenhuma.
  if (precisaDefinirSenha && location.pathname !== '/definir-senha') {
    return <Navigate to="/definir-senha" replace />;
  }

  // 2FA é opcional (ver useAutenticacao.js) -- só entra aqui quem JÁ escolheu um método
  // e ainda não completou o desafio desta sessão. Configurar é sempre voluntário, via
  // Meu Perfil, nunca forçado por rota. O backend já bloqueia qualquer outra rota de
  // verdade (SupabaseAuthGuard); isto aqui só evita bater em 403 tela por tela.
  if (mfaPendente === 'desafio' && location.pathname !== '/verificar-mfa') {
    return <Navigate to="/verificar-mfa" replace />;
  }

  return children;
}
