import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Banknote, BookOpen, Building2, DollarSign, FileSignature, FileStack, FileTextIcon, HandCoins, Home, KeyRound, Landmark, LayoutDashboard, Link2, ListChecks, ListPlus, Receipt, Scale, TrendingUp, Truck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModulosLicenciados } from '../../hooks/useModulosLicenciados';

interface ItemMenu {
  nome: string;
  caminho: string;
  icone: React.ElementType;
  // Ausente = núcleo, sempre visível. Presente = só aparece se a empresa ativa tiver o
  // módulo liberado (useModulosLicenciados) -- ver docs do backend em @common/modulos.
  modulo?: string;
}

interface SecaoMenu {
  titulo: string;
  itens: ItemMenu[];
}

// Cresce módulo a módulo conforme cada tela do jotaCaixa é portada -- não lista links
// pra telas que ainda não existem (evita link morto).
const SECOES_MENU: SecaoMenu[] = [
  {
    titulo: 'Geral',
    itens: [
      { nome: 'Painel', caminho: '/painel', icone: Home },
      { nome: 'Carteira de Empresas', caminho: '/contabil/empresas', icone: LayoutDashboard },
    ],
  },
  {
    titulo: 'Contabilidade',
    itens: [
      { nome: 'Lançamentos', caminho: '/lancamentos', icone: DollarSign },
      { nome: 'Conciliação Bancária', caminho: '/conciliacao-bancaria', icone: Landmark, modulo: 'conciliacao_bancaria' },
      { nome: 'Bancos', caminho: '/bancos', icone: Banknote, modulo: 'bancos' },
      { nome: 'Sugestões de Extrato', caminho: '/sugestoes-extrato', icone: ListPlus, modulo: 'conciliacao_bancaria' },
      { nome: 'Mapeamento', caminho: '/mapeamento', icone: Link2, modulo: 'conciliacao_bancaria' },
      { nome: 'Contas a Pagar', caminho: '/contas-a-pagar', icone: Receipt },
      { nome: 'Contas a Receber', caminho: '/contas-a-receber', icone: HandCoins },
      { nome: 'Plano de Contas', caminho: '/plano-contas', icone: BookOpen },
    ],
  },
  {
    titulo: 'Cadastros',
    itens: [
      { nome: 'Clientes', caminho: '/clientes', icone: Users },
      { nome: 'Fornecedores', caminho: '/fornecedores', icone: Truck },
      { nome: 'Históricos', caminho: '/historicos', icone: ListChecks },
    ],
  },
  {
    titulo: 'Atendimento',
    itens: [{ nome: 'Protocolos', caminho: '/protocolos', icone: FileStack, modulo: 'protocolos' }],
  },
  {
    titulo: 'Contratos & Societário',
    itens: [
      { nome: 'Contratos', caminho: '/contratos', icone: FileSignature, modulo: 'contratos' },
      { nome: 'Documentos Societários', caminho: '/documentos-societarios', icone: Building2, modulo: 'documentos_societarios' },
    ],
  },
  {
    titulo: 'Relatórios',
    itens: [
      { nome: 'Fluxo de Caixa', caminho: '/relatorios/fluxo-caixa', icone: TrendingUp, modulo: 'relatorios' },
      { nome: 'Balancete', caminho: '/relatorios/balancete', icone: FileTextIcon, modulo: 'relatorios' },
      { nome: 'Balanço Patrimonial', caminho: '/relatorios/balanco', icone: Scale, modulo: 'relatorios' },
      { nome: 'DRE', caminho: '/relatorios/dre', icone: BarChart3, modulo: 'relatorios' },
      { nome: 'Razão', caminho: '/relatorios/razao', icone: BookOpen, modulo: 'relatorios' },
    ],
  },
  {
    titulo: 'Licenciamento',
    itens: [{ nome: 'Minhas Licenças', caminho: '/minhas-licencas', icone: KeyRound }],
  },
];

interface MenuLateralProps {
  onLinkClick?: () => void;
}

export default function MenuLateral({ onLinkClick }: MenuLateralProps) {
  const localizacao = useLocation();
  const { temModulo } = useModulosLicenciados();

  return (
    <nav className="flex h-full flex-col overflow-y-auto py-4">
      <div className="px-4 pb-4">
        <span className="text-lg font-bold text-primary">JOTA CONTÁBIL</span>
      </div>
      {SECOES_MENU.map((secao) => {
        const itensVisiveis = secao.itens.filter((item) => !item.modulo || temModulo(item.modulo));
        if (itensVisiveis.length === 0) return null;
        return (
          <div key={secao.titulo} className="px-2 py-2">
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{secao.titulo}</p>
            {itensVisiveis.map((item) => {
              const ativo = localizacao.pathname.startsWith(item.caminho);
              const Icone = item.icone;
              return (
                <Link
                  key={item.caminho}
                  to={item.caminho}
                  onClick={onLinkClick}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium',
                    ativo ? 'bg-primary/10 text-primary' : 'text-foreground/80 hover:bg-accent',
                  )}
                >
                  <Icone className="h-4 w-4" />
                  {item.nome}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
