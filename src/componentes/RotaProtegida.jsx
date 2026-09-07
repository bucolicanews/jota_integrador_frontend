import { Navigate } from 'react-router-dom';
import { useAutenticacao } from '../hooks/useAutenticacao';

export function RotaProtegida({ children }) {
  const { usuario, carregando } = useAutenticacao();

  if (carregando) {
    return <div className="flex h-screen items-center justify-center text-gray-500">Carregando...</div>;
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
