import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { RotaProtegida } from './componentes/RotaProtegida';
import { RotaPublica } from './componentes/RotaPublica';
import Login from './paginas/login';
import Contabil from './paginas/contabil';
import Fiscal from './paginas/fiscal';
import PendenciasAtivacaoModulo from './pages/PendenciasAtivacaoModulo';
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
import PlanoContas from './pages/PlanoContas';
import Lancamentos from './pages/Lancamentos';
import Balancete from './pages/Balancete';
import BalancoPatrimonial from './pages/BalancoPatrimonial';
import DRE from './pages/DRE';
import Razao from './pages/Razao';
import FluxoCaixa from './pages/FluxoCaixa';
import Conciliacao from './pages/Conciliacao';
import Painel from './pages/Painel';
import ContasAPagar from './pages/ContasAPagar';
import ContasAReceber from './pages/ContasAReceber';
import Clientes from './pages/Clientes';
import Fornecedores from './pages/Fornecedores';
import Historicos from './pages/Historicos';
import Protocolos from './pages/Protocolos';
import Bancos from './pages/Bancos';
import PicklistsExtrato from './pages/PicklistsExtrato';
import Mapeamento from './pages/Mapeamento';
import Perfil from './pages/Perfil';
import Contratos from './pages/Contratos';
import ContratoNovo from './pages/ContratoNovo';
import ContratoPreencher from './pages/ContratoPreencher';
import ContratoDetalhe from './pages/ContratoDetalhe';
import ContratoModelos from './pages/ContratoModelos';
import AssinarContrato from './pages/AssinarContrato';
import DocumentosSocietarios from './pages/DocumentosSocietarios';
import DocumentosSocietariosModelos from './pages/DocumentosSocietariosModelos';
import DocumentosSocietariosBlocos from './pages/DocumentosSocietariosBlocos';
import DocumentoSocietarioGerar from './pages/DocumentoSocietarioGerar';
import DocumentoSocietarioDetalhe from './pages/DocumentoSocietarioDetalhe';
import MinhasLicencas from './pages/MinhasLicencas';
import AdminPacotes from './pages/AdminPacotes';
import AdminPlanos from './pages/AdminPlanos';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import Configuracoes from './pages/Configuracoes';
import Suporte from './pages/Suporte';
import PontoEletronico from './pages/PontoEletronico';
import FolhaPonto from './pages/FolhaPonto';

function RedirecionamentoInicial() {
  // Todo papel entra pelo mesmo /painel (LayoutPrincipal+MenuLateral) -- cada um vê só o
  // que o próprio papel/módulo licenciado libera. /contabil (legado) e /fiscal continuam
  // acessíveis (link da marca no Header), mas deixam de ser o destino forçado do login.
  return <Navigate to="/painel" replace />;
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
          path="/pendencias-ativacao-modulo"
          element={
            <RotaProtegida>
              <PendenciasAtivacaoModulo />
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
        <Route
          path="/painel"
          element={
            <RotaProtegida>
              <Painel />
            </RotaProtegida>
          }
        />
        <Route
          path="/plano-contas"
          element={
            <RotaProtegida>
              <PlanoContas />
            </RotaProtegida>
          }
        />
        <Route
          path="/lancamentos"
          element={
            <RotaProtegida>
              <Lancamentos />
            </RotaProtegida>
          }
        />
        <Route
          path="/conciliacao-bancaria"
          element={
            <RotaProtegida>
              <Conciliacao />
            </RotaProtegida>
          }
        />
        <Route
          path="/contas-a-pagar"
          element={
            <RotaProtegida>
              <ContasAPagar />
            </RotaProtegida>
          }
        />
        <Route
          path="/contas-a-receber"
          element={
            <RotaProtegida>
              <ContasAReceber />
            </RotaProtegida>
          }
        />
        <Route
          path="/clientes"
          element={
            <RotaProtegida>
              <Clientes />
            </RotaProtegida>
          }
        />
        <Route
          path="/fornecedores"
          element={
            <RotaProtegida>
              <Fornecedores />
            </RotaProtegida>
          }
        />
        <Route
          path="/historicos"
          element={
            <RotaProtegida>
              <Historicos />
            </RotaProtegida>
          }
        />
        <Route
          path="/protocolos"
          element={
            <RotaProtegida>
              <Protocolos />
            </RotaProtegida>
          }
        />
        <Route
          path="/bancos"
          element={
            <RotaProtegida>
              <Bancos />
            </RotaProtegida>
          }
        />
        <Route
          path="/sugestoes-extrato"
          element={
            <RotaProtegida>
              <PicklistsExtrato />
            </RotaProtegida>
          }
        />
        <Route
          path="/mapeamento"
          element={
            <RotaProtegida>
              <Mapeamento />
            </RotaProtegida>
          }
        />
        <Route
          path="/perfil"
          element={
            <RotaProtegida>
              <Perfil />
            </RotaProtegida>
          }
        />
        <Route
          path="/relatorios/balancete"
          element={
            <RotaProtegida>
              <Balancete />
            </RotaProtegida>
          }
        />
        <Route
          path="/relatorios/balanco"
          element={
            <RotaProtegida>
              <BalancoPatrimonial />
            </RotaProtegida>
          }
        />
        <Route
          path="/relatorios/dre"
          element={
            <RotaProtegida>
              <DRE />
            </RotaProtegida>
          }
        />
        <Route
          path="/relatorios/razao"
          element={
            <RotaProtegida>
              <Razao />
            </RotaProtegida>
          }
        />
        <Route
          path="/relatorios/fluxo-caixa"
          element={
            <RotaProtegida>
              <FluxoCaixa />
            </RotaProtegida>
          }
        />
        <Route
          path="/contratos"
          element={
            <RotaProtegida>
              <Contratos />
            </RotaProtegida>
          }
        />
        <Route
          path="/contratos/novo"
          element={
            <RotaProtegida>
              <ContratoNovo />
            </RotaProtegida>
          }
        />
        <Route
          path="/contratos/preencher/:modeloId"
          element={
            <RotaProtegida>
              <ContratoPreencher />
            </RotaProtegida>
          }
        />
        <Route
          path="/contratos/modelos"
          element={
            <RotaProtegida>
              <ContratoModelos />
            </RotaProtegida>
          }
        />
        <Route
          path="/contratos/:id"
          element={
            <RotaProtegida>
              <ContratoDetalhe />
            </RotaProtegida>
          }
        />
        <Route
          path="/documentos-societarios"
          element={
            <RotaProtegida>
              <DocumentosSocietarios />
            </RotaProtegida>
          }
        />
        <Route
          path="/documentos-societarios/modelos"
          element={
            <RotaProtegida>
              <DocumentosSocietariosModelos />
            </RotaProtegida>
          }
        />
        <Route
          path="/documentos-societarios/blocos"
          element={
            <RotaProtegida>
              <DocumentosSocietariosBlocos />
            </RotaProtegida>
          }
        />
        <Route
          path="/documentos-societarios/gerar/:modeloId"
          element={
            <RotaProtegida>
              <DocumentoSocietarioGerar />
            </RotaProtegida>
          }
        />
        <Route
          path="/documentos-societarios/:id"
          element={
            <RotaProtegida>
              <DocumentoSocietarioDetalhe />
            </RotaProtegida>
          }
        />
        <Route
          path="/minhas-licencas"
          element={
            <RotaProtegida>
              <MinhasLicencas />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/pacotes"
          element={
            <RotaProtegida>
              <AdminPacotes />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/planos"
          element={
            <RotaProtegida>
              <AdminPlanos />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <RotaProtegida>
              <GerenciarUsuarios />
            </RotaProtegida>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <RotaProtegida>
              <Configuracoes />
            </RotaProtegida>
          }
        />
        <Route
          path="/suporte"
          element={
            <RotaProtegida>
              <Suporte />
            </RotaProtegida>
          }
        />
        <Route
          path="/ponto-eletronico"
          element={
            <RotaProtegida>
              <PontoEletronico />
            </RotaProtegida>
          }
        />
        <Route
          path="/folha-ponto"
          element={
            <RotaProtegida>
              <FolhaPonto />
            </RotaProtegida>
          }
        />
        {/* Pública de propósito -- cliente final assina sem login, sem RotaProtegida nem RotaPublica. */}
        <Route path="/assinar-contrato/:token" element={<AssinarContrato />} />
        {/* Qualquer rota não mapeada (ex: link antigo salvo no navegador) volta pro início em vez de dar tela branca. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
