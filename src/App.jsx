import { lazy, Suspense } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { RotaProtegida } from './componentes/RotaProtegida';
import { RotaPublica } from './componentes/RotaPublica';
import Login from './paginas/login';

const DefinirSenha = lazy(() => import('./paginas/definir-senha'));
const ConfigurarMfa = lazy(() => import('./paginas/configurar-mfa'));
const VerificarMfa = lazy(() => import('./paginas/verificar-mfa'));
const Contabil = lazy(() => import('./paginas/contabil'));
const Fiscal = lazy(() => import('./paginas/fiscal'));
const ContabilEmpresas = lazy(() => import('./paginas/contabil-empresas'));
const ContabilEmpresaDetalhe = lazy(() => import('./paginas/contabil-empresa-detalhe'));
const ContabilAssinatura = lazy(() => import('./paginas/contabil-assinatura'));
const ContabilHonorarios = lazy(() => import('./paginas/contabil-honorarios'));
const ContabilCreditos = lazy(() => import('./paginas/contabil-creditos'));
const ContabilEmpresaCaixaPostal = lazy(() => import('./paginas/contabil-empresa-caixa-postal'));
const ContabilAuditoria = lazy(() => import('./paginas/contabil-auditoria'));
const ContabilConfiguracoesFiscais = lazy(() => import('./paginas/contabil-configuracoes-fiscais'));
const ContabilAdminContadores = lazy(() => import('./paginas/contabil-admin-contadores'));
const ContabilAdminEmpresas = lazy(() => import('./paginas/contabil-admin-empresas'));
const PlanoContas = lazy(() => import('./pages/PlanoContas'));
const Lancamentos = lazy(() => import('./pages/Lancamentos'));
const Balancete = lazy(() => import('./pages/Balancete'));
const BalancoPatrimonial = lazy(() => import('./pages/BalancoPatrimonial'));
const DRE = lazy(() => import('./pages/DRE'));
const Razao = lazy(() => import('./pages/Razao'));
const FluxoCaixa = lazy(() => import('./pages/FluxoCaixa'));
const Conciliacao = lazy(() => import('./pages/Conciliacao'));
const Painel = lazy(() => import('./pages/Painel'));
const ContasAPagar = lazy(() => import('./pages/ContasAPagar'));
const ContasAReceber = lazy(() => import('./pages/ContasAReceber'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Fornecedores = lazy(() => import('./pages/Fornecedores'));
const Historicos = lazy(() => import('./pages/Historicos'));
const Das = lazy(() => import('./pages/Das'));
const Ccmei = lazy(() => import('./pages/Ccmei'));
const CaixaPostal = lazy(() => import('./pages/CaixaPostal'));
const Protocolos = lazy(() => import('./pages/Protocolos'));
const Tarefas = lazy(() => import('./pages/Tarefas'));
const Bancos = lazy(() => import('./pages/Bancos'));
const Caixa = lazy(() => import('./pages/Caixa'));
const ContasSaldos = lazy(() => import('./pages/ContasSaldos'));
const PicklistsExtrato = lazy(() => import('./pages/PicklistsExtrato'));
const Mapeamento = lazy(() => import('./pages/Mapeamento'));
const Perfil = lazy(() => import('./pages/Perfil'));
const Contratos = lazy(() => import('./pages/Contratos'));
const ContratoNovo = lazy(() => import('./pages/ContratoNovo'));
const ContratoPreencher = lazy(() => import('./pages/ContratoPreencher'));
const ContratoDetalhe = lazy(() => import('./pages/ContratoDetalhe'));
const ContratoModelos = lazy(() => import('./pages/ContratoModelos'));
const ContratoConfiguracao = lazy(() => import('./pages/ContratoConfiguracao'));
const AssinarContrato = lazy(() => import('./pages/AssinarContrato'));
const DocumentosSocietarios = lazy(() => import('./pages/DocumentosSocietarios'));
const DocumentosSocietariosModelos = lazy(() => import('./pages/DocumentosSocietariosModelos'));
const DocumentosSocietariosBlocos = lazy(() => import('./pages/DocumentosSocietariosBlocos'));
const DocumentoSocietarioGerar = lazy(() => import('./pages/DocumentoSocietarioGerar'));
const DocumentoSocietarioDetalhe = lazy(() => import('./pages/DocumentoSocietarioDetalhe'));
const MinhasLicencas = lazy(() => import('./pages/MinhasLicencas'));
const Creditos = lazy(() => import('./pages/Creditos'));
const MinhaAssinatura = lazy(() => import('./pages/MinhaAssinatura'));
const AdminPlanos = lazy(() => import('./pages/AdminPlanos'));
const AdminCreditosAvulsos = lazy(() => import('./pages/AdminCreditosAvulsos'));
const GerenciarUsuarios = lazy(() => import('./pages/GerenciarUsuarios'));
const GerenciarPapeis = lazy(() => import('./pages/GerenciarPapeis'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const Suporte = lazy(() => import('./pages/Suporte'));
const PontoEletronico = lazy(() => import('./pages/PontoEletronico'));
const FolhaPonto = lazy(() => import('./pages/FolhaPonto'));

function CarregandoPagina() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function RedirecionamentoInicial() {
  // Todo papel entra pelo mesmo /painel (LayoutPrincipal+MenuLateral) -- cada um vê só o
  // que o próprio papel/módulo licenciado libera. /contabil (legado) e /fiscal continuam
  // acessíveis (link da marca no Header), mas deixam de ser o destino forçado do login.
  return <Navigate to="/painel" replace />;
}

export default function App() {
  return (
    <Router>
      <Suspense fallback={<CarregandoPagina />}>
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
          path="/definir-senha"
          element={
            <RotaProtegida>
              <DefinirSenha />
            </RotaProtegida>
          }
        />
        <Route
          path="/configurar-mfa"
          element={
            <RotaProtegida>
              <ConfigurarMfa />
            </RotaProtegida>
          }
        />
        <Route
          path="/verificar-mfa"
          element={
            <RotaProtegida>
              <VerificarMfa />
            </RotaProtegida>
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
          path="/contabil/configuracoes-fiscais"
          element={
            <RotaProtegida>
              <ContabilConfiguracoesFiscais />
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
          path="/das"
          element={
            <RotaProtegida>
              <Das />
            </RotaProtegida>
          }
        />
        <Route
          path="/ccmei"
          element={
            <RotaProtegida>
              <Ccmei />
            </RotaProtegida>
          }
        />
        <Route
          path="/caixa-postal"
          element={
            <RotaProtegida>
              <CaixaPostal />
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
          path="/tarefas"
          element={
            <RotaProtegida>
              <Tarefas />
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
          path="/caixa"
          element={
            <RotaProtegida>
              <Caixa />
            </RotaProtegida>
          }
        />
        <Route
          path="/contas-saldos"
          element={
            <RotaProtegida>
              <ContasSaldos />
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
          path="/contratos/configuracao"
          element={
            <RotaProtegida>
              <ContratoConfiguracao />
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
          path="/creditos"
          element={
            <RotaProtegida>
              <Creditos />
            </RotaProtegida>
          }
        />
        <Route
          path="/minha-assinatura"
          element={
            <RotaProtegida>
              <MinhaAssinatura />
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
          path="/admin/creditos-avulsos"
          element={
            <RotaProtegida>
              <AdminCreditosAvulsos />
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
          path="/admin/papeis"
          element={
            <RotaProtegida>
              <GerenciarPapeis />
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
      </Suspense>
      <Toaster richColors closeButton />
    </Router>
  );
}
