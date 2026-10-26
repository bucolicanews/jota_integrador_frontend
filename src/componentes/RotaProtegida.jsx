import { Navigate, useLocation } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';

export function RotaProtegida({ children }) {
  const { usuario, carregando, precisaDefinirSenha } = useAutenticacao();
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

  return children;
}
