import { Navigate } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';

/** Irmã do RotaProtegida, sentido oposto: se já existe sessão, tira do /login em vez
 * de deixar o formulário parado (signInWithPassword sozinho não navega pra lugar
 * nenhum). */
export function RotaPublica({ children }) {
  const { usuario, carregando } = useAutenticacao();

  if (carregando) {
    return <div className="flex h-screen items-center justify-center text-gray-500">Carregando...</div>;
  }

  if (usuario) {
    return <Navigate to="/" replace />;
  }

  return children;
}
