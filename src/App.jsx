import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { useAutenticacao } from './hooks/useAutenticacao';
import { RotaProtegida } from './componentes/RotaProtegida';
import { RotaPublica } from './componentes/RotaPublica';
import Login from './paginas/login';
import Contabil from './paginas/contabil';
import Fiscal from './paginas/fiscal';
import ContabilEmpresas from './paginas/contabil-empresas';
import ContabilEmpresaDetalhe from './paginas/contabil-empresa-detalhe';
import ContabilEmpresaAcessoSerpro from './paginas/contabil-empresa-acesso-serpro';
import ContabilAssinatura from './paginas/contabil-assinatura';
import ContabilHonorarios from './paginas/contabil-honorarios';
import ContabilCreditos from './paginas/contabil-creditos';
import ContabilEmpresaCaixaPostal from './paginas/contabil-empresa-caixa-postal';
import ContabilAuditoria from './paginas/contabil-auditoria';
import ContabilAdminContadores from './paginas/contabil-admin-contadores';
import ContabilAdminEmpresas from './paginas/contabil-admin-empresas';

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
        <Route
          path="/contabil/empresas"
          element={
            <RotaProtegida>
              <ContabilEmpresas />
            </RotaProtegida>
          }
        />
        <Route
          path="/contabil/empresas/:id"
          element={
            <RotaProtegida>
              <ContabilEmpresaDetalhe />
            </RotaProtegida>
          }
        />
        <Route
          path="/contabil/empresas/:id/acesso-serpro"
          element={
            <RotaProtegida>
              <ContabilEmpresaAcessoSerpro />
            </RotaProtegida>
          }
        />
        <Route
          path="/contabil/assinatura"
          element={
            <RotaProtegida>
              <ContabilAssinatura />
            </RotaProtegida>
          }
        />
        <Route
          path="/contabil/honorarios"
          element={
            <RotaProtegida>
              <ContabilHonorarios />
            </RotaProtegida>
          }
        />
        <Route
          path="/contabil/creditos"
          element={
            <RotaProtegida>
              <ContabilCreditos />
            </RotaProtegida>
          }
        />
        <Route
          path="/contabil/empresas/:id/caixa-postal"
          element={
            <RotaProtegida>
              <ContabilEmpresaCaixaPostal />
            </RotaProtegida>
          }
        />
        <Route
          path="/contabil/auditoria"
          element={
            <RotaProtegida>
              <ContabilAuditoria />
            </RotaProtegida>
          }
        />
        <Route
          path="/contabil/contadores"
          element={
            <RotaProtegida>
              <ContabilAdminContadores />
            </RotaProtegida>
          }
        />
        <Route
          path="/contabil/empresas-todas"
          element={
            <RotaProtegida>
              <ContabilAdminEmpresas />
            </RotaProtegida>
          }
        />
      </Routes>
    </Router>
  );
}
