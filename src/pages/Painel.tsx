import { Link } from 'react-router-dom';
import {
  BarChart3,
  Banknote,
  BookOpen,
  DollarSign,
  FileStack,
  FileTextIcon,
  HandCoins,
  Landmark,
  ListChecks,
  Receipt,
  Scale,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';

interface AtalhoModulo {
  nome: string;
  descricao: string;
  caminho: string;
  icone: React.ElementType;
}

interface SecaoAtalhos {
  titulo: string;
  itens: AtalhoModulo[];
}

const SECOES: SecaoAtalhos[] = [
  {
    titulo: 'Contabilidade',
    itens: [
      { nome: 'Lançamentos', descricao: 'Lançamentos manuais em partida dobrada', caminho: '/lancamentos', icone: DollarSign },
      { nome: 'Conciliação Bancária', descricao: 'Importar extrato e conciliar transações', caminho: '/conciliacao-bancaria', icone: Landmark },
      { nome: 'Bancos', descricao: 'Contas de caixa/banco e saldo ao vivo', caminho: '/bancos', icone: Banknote },
      { nome: 'Contas a Pagar', descricao: 'Contas parceladas e pagamentos', caminho: '/contas-a-pagar', icone: Receipt },
      { nome: 'Contas a Receber', descricao: 'Contas parceladas e recebimentos', caminho: '/contas-a-receber', icone: HandCoins },
      { nome: 'Plano de Contas', descricao: 'Hierarquia de contas contábeis', caminho: '/plano-contas', icone: BookOpen },
    ],
  },
  {
    titulo: 'Cadastros',
    itens: [
      { nome: 'Clientes', descricao: 'Cadastro de clientes', caminho: '/clientes', icone: Users },
      { nome: 'Fornecedores', descricao: 'Cadastro de fornecedores', caminho: '/fornecedores', icone: Truck },
      { nome: 'Históricos', descricao: 'Descrições sugeridas pros lançamentos', caminho: '/historicos', icone: ListChecks },
    ],
  },
  {
    titulo: 'Atendimento',
    itens: [{ nome: 'Protocolos', descricao: 'Rastreamento de entrega de documentos ao cliente', caminho: '/protocolos', icone: FileStack }],
  },
  {
    titulo: 'Relatórios',
    itens: [
      { nome: 'Fluxo de Caixa', descricao: 'Movimentações de caixa e banco', caminho: '/relatorios/fluxo-caixa', icone: TrendingUp },
      { nome: 'Balancete', descricao: 'Saldos de todas as contas no período', caminho: '/relatorios/balancete', icone: FileTextIcon },
      { nome: 'Balanço Patrimonial', descricao: 'Ativo, Passivo e Patrimônio Líquido', caminho: '/relatorios/balanco', icone: Scale },
      { nome: 'DRE', descricao: 'Demonstrativo de Resultado do Exercício', caminho: '/relatorios/dre', icone: BarChart3 },
      { nome: 'Razão', descricao: 'Extrato analítico por conta contábil', caminho: '/relatorios/razao', icone: BookOpen },
    ],
  },
];

export default function Painel() {
  const { empresaAtiva } = useEmpresaAtiva();

  return (
    <LayoutPrincipal>
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">Painel</h1>
        {empresaAtiva && (
          <p className="text-sm text-muted-foreground">
            {empresaAtiva.razaoSocial} {empresaAtiva.cnpj && <span className="font-mono">— {empresaAtiva.cnpj}</span>}
          </p>
        )}
      </div>

      {SECOES.map((secao) => (
        <div key={secao.titulo} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{secao.titulo}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {secao.itens.map((item) => {
              const Icone = item.icone;
              return (
                <Link key={item.caminho} to={item.caminho}>
                  <Card className="h-full transition hover:border-primary/50 hover:shadow-md">
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className="rounded-md bg-primary/10 p-2">
                        <Icone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{item.nome}</p>
                        <p className="text-xs text-muted-foreground">{item.descricao}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </LayoutPrincipal>
  );
}
