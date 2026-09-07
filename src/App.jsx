import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { useAutenticacao } from './hooks/useAutenticacao';
import { RotaProtegida } from './componentes/RotaProtegida';
import { RotaPublica } from './componentes/RotaPublica';
import Login from './paginas/login';
import Contabil from './paginas/contabil';
import Fiscal from './paginas/fiscal';

const PAPEIS_CONTADOR = ['SUPER_ADMIN', 'ADMIN_FINANCEIRO', 'ADMIN_SUPORTE', 'CONTADOR_DONO', 'OPERADOR_CONTADOR'];

function RedirecionamentoInicial() {
  const { usuario } = useAutenticacao();
  const destino = PAPEIS_CONTADOR.includes(usuario?.papel) ? '/contabil' : '/fiscal';
  return <Navigate to={destino} replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            <RotaPublica>
              <Login />
            </RotaPublica>
          }
        />
        <Route
          path="/"
          element={
            <RotaProtegida>
              <RedirecionamentoInicial />
            </RotaProtegida>
          }
        />
        <Route
          path="/contabil"
          element={
            <RotaProtegida>
              <Contabil />
            </RotaProtegida>
          }
        />
        <Route
          path="/fiscal"
          element={
            <RotaProtegida>
              <Fiscal />
            </RotaProtegida>
          }
        />
      </Routes>
    </Router>
  );
}
