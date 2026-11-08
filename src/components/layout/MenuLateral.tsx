import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Banknote, BookOpen, Building2, ClipboardList, Clock, Coins, CreditCard, DollarSign, FileSignature, FileStack, FileTextIcon, HandCoins, Home, Inbox, KeyRound, Landmark, LayoutDashboard, LifeBuoy, Link2, ListChecks, ListPlus, Receipt, ReceiptText, Scale, Settings, ShieldCheck, TrendingUp, Truck, UserCog, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModulosLicenciados } from '../../hooks/useModulosLicenciados';
import { listarPermissoesUsuario } from '../../servicos/usuarios';

// Espelha papelExigeChecagemGranular() do backend (src/auth/dominio/permissao.ts) --
// OPERADOR_CONTADOR/OPERADOR_EMPRESA (funcionário) e ADMIN_FINANCEIRO/ADMIN_SUPORTE
// (admin de plataforma, não o dono) são restritos. SUPER_ADMIN/CONTADOR_DONO/
// EMPRESARIO_DONO nunca são restritos aqui, mesma regra do PermissoesGuard.
const PAPEIS_RESTRITOS_POR_PERMISSAO = ['OPERADOR_CONTADOR', 'OPERADOR_EMPRESA', 'ADMIN_FINANCEIRO', 'ADMIN_SUPORTE'];

interface ItemMenu {
  nome: string;
  caminho: string;
  icone: React.ElementType;
  // Ausente = núcleo, sempre visível. Presente = só aparece se a empresa ativa tiver o
  // módulo liberado (useModulosLicenciados) -- ver docs do backend em @common/modulos.
  modulo?: string;
  // Ausente = qualquer papel autenticado. Presente = só aparece pros papéis listados
  // (mesmo catálogo de src/auth/dominio/papel.ts do backend, que sempre revalida de novo).
  papeis?: string[];
  // Ausente = não é restringível por permissão individual (dono sempre vê, operador também
  // sempre vê). Presente = pra OPERADOR_CONTADOR/OPERADOR_EMPRESA, só aparece se esse
  // usuário específico tiver "recurso:visualizar" concedido (usuario_permissoes, mesmo
  // catálogo que o PermissoesGuard do backend já reforça em cada endpoint -- isso aqui é
  // só UX, não é a camada de segurança real).
  recurso?: string;
}

interface SecaoMenu {
  titulo: string;
  itens: ItemMenu[];
}

// Papéis que navegam a carteira (contador de verdade + plataforma, que usa o workspace fixo
// da própria Jota) -- mesmo grupo que antes só existia espalhado no CabecalhoContabil (shell
// legado dos /contabil/* substituído por este MenuLateral).
const PAPEIS_CARTEIRA = ['SUPER_ADMIN', 'ADMIN_FINANCEIRO', 'ADMIN_SUPORTE', 'CONTADOR_DONO', 'OPERADOR_CONTADOR'];
const PAPEIS_PLATAFORMA = ['SUPER_ADMIN', 'ADMIN_FINANCEIRO', 'ADMIN_SUPORTE'];
// Autoatendimento do PRÓPRIO escritório do contador -- não faz sentido pra admin (não é
// um contador, não tem assinatura/honorários/créditos próprios pra gerenciar aqui; a
// visão dele sobre o que cada contador comprou/deve já existe via o botão "Créditos" na
// tela "Contadores", não precisa deste link de autoatendimento no menu).
const PAPEIS_ESCRITORIO_CONTADOR = ['CONTADOR_DONO', 'OPERADOR_CONTADOR'];

// Cresce módulo a módulo conforme cada tela do jotaCaixa é portada -- não lista links
// pra telas que ainda não existem (evita link morto).
const SECOES_MENU: SecaoMenu[] = [
  {
    titulo: 'Geral',
    itens: [
      { nome: 'Painel', caminho: '/painel', icone: Home },
      { nome: 'Carteira de Empresas', caminho: '/contabil/empresas', icone: LayoutDashboard, papeis: PAPEIS_CARTEIRA, recurso: 'carteira_empresas' },
      { nome: 'Minha Empresa', caminho: '/fiscal', icone: Building2, papeis: ['EMPRESARIO_DONO', 'OPERADOR_EMPRESA'] },
      { nome: 'Créditos', caminho: '/creditos', icone: Coins, papeis: ['EMPRESARIO_DONO', 'OPERADOR_EMPRESA'] },
      { nome: 'Minha Assinatura', caminho: '/minha-assinatura', icone: CreditCard, papeis: ['EMPRESARIO_DONO', 'OPERADOR_EMPRESA'] },
    ],
  },
  {
    titulo: 'Escritório',
    itens: [
      { nome: 'Assinatura', caminho: '/contabil/assinatura', icone: CreditCard, papeis: PAPEIS_ESCRITORIO_CONTADOR },
      { nome: 'Honorários', caminho: '/contabil/honorarios', icone: Coins, papeis: PAPEIS_ESCRITORIO_CONTADOR },
      { nome: 'Créditos', caminho: '/contabil/creditos', icone: Banknote, papeis: PAPEIS_ESCRITORIO_CONTADOR },
      { nome: 'Auditoria', caminho: '/contabil/auditoria', icone: ClipboardList, papeis: PAPEIS_CARTEIRA, recurso: 'auditoria' },
    ],
  },
  {
    titulo: 'Contabilidade',
    itens: [
      { nome: 'Lançamentos', caminho: '/lancamentos', icone: DollarSign, modulo: 'lancamentos', recurso: 'lancamentos' },
      { nome: 'Conciliação Bancária', caminho: '/conciliacao-bancaria', icone: Landmark, modulo: 'conciliacao_bancaria', recurso: 'conciliacao_bancaria' },
      { nome: 'Bancos', caminho: '/bancos', icone: Banknote, modulo: 'bancos', recurso: 'bancos' },
      { nome: 'Sugestões de Extrato', caminho: '/sugestoes-extrato', icone: ListPlus, modulo: 'conciliacao_bancaria', recurso: 'sugestoes_extrato' },
      { nome: 'Mapeamento', caminho: '/mapeamento', icone: Link2, modulo: 'conciliacao_bancaria', recurso: 'mapeamento' },
      { nome: 'Contas a Pagar', caminho: '/contas-a-pagar', icone: Receipt, modulo: 'contas_a_pagar', recurso: 'contas_a_pagar' },
      { nome: 'Contas a Receber', caminho: '/contas-a-receber', icone: HandCoins, modulo: 'contas_a_receber', recurso: 'contas_a_receber' },
      { nome: 'Plano de Contas', caminho: '/plano-contas', icone: BookOpen, modulo: 'plano_contas', recurso: 'plano_contas' },
    ],
  },
  // Tudo que fala com o SERPRO em nome da empresa entra aqui -- mesmo módulo "fiscal"
  // que já gate DAS e Caixa Postal (CCMEI, Procuração/Certificado etc entram aqui
  // conforme forem ganhando tela própria).
  {
    titulo: 'Fiscal',
    itens: [
      { nome: 'DAS', caminho: '/das', icone: ReceiptText, modulo: 'fiscal', recurso: 'das' },
      { nome: 'Caixa Postal', caminho: '/caixa-postal', icone: Inbox, modulo: 'fiscal', recurso: 'caixa_postal' },
    ],
  },
  {
    titulo: 'Configurações',
    itens: [
      { nome: 'Fiscais', caminho: '/contabil/configuracoes-fiscais', icone: Settings, papeis: PAPEIS_CARTEIRA, recurso: 'configuracoes_fiscais' },
    ],
  },
  {
    titulo: 'Cadastros',
    itens: [
      { nome: 'Clientes', caminho: '/clientes', icone: Users, modulo: 'clientes', recurso: 'clientes' },
      { nome: 'Fornecedores', caminho: '/fornecedores', icone: Truck, modulo: 'fornecedores', recurso: 'fornecedores' },
      { nome: 'Históricos', caminho: '/historicos', icone: ListChecks, modulo: 'historicos', recurso: 'historicos' },
    ],
  },
  {
    titulo: 'Atendimento',
    itens: [
      { nome: 'Protocolos', caminho: '/protocolos', icone: FileStack, modulo: 'protocolos', recurso: 'protocolos' },
      { nome: 'Suporte', caminho: '/suporte', icone: LifeBuoy, recurso: 'suporte' },
    ],
  },
  {
    titulo: 'Contratos & Societário',
    itens: [
      { nome: 'Contratos', caminho: '/contratos', icone: FileSignature, modulo: 'contratos', recurso: 'contratos' },
      { nome: 'Documentos Societários', caminho: '/documentos-societarios', icone: Building2, modulo: 'documentos_societarios', recurso: 'documentos_societarios' },
    ],
  },
  {
    titulo: 'Relatórios',
    itens: [
      { nome: 'Fluxo de Caixa', caminho: '/relatorios/fluxo-caixa', icone: TrendingUp, modulo: 'relatorios', recurso: 'relatorios' },
      { nome: 'Balancete', caminho: '/relatorios/balancete', icone: FileTextIcon, modulo: 'relatorios', recurso: 'relatorios' },
      { nome: 'Balanço Patrimonial', caminho: '/relatorios/balanco', icone: Scale, modulo: 'relatorios', recurso: 'relatorios' },
      { nome: 'DRE', caminho: '/relatorios/dre', icone: BarChart3, modulo: 'relatorios', recurso: 'relatorios' },
      { nome: 'Razão', caminho: '/relatorios/razao', icone: BookOpen, modulo: 'relatorios', recurso: 'relatorios' },
    ],
  },
  {
    titulo: 'Licenciamento',
    itens: [
      {
        nome: 'Minhas Licenças',
        caminho: '/minhas-licencas',
        icone: KeyRound,
        papeis: PAPEIS_ESCRITORIO_CONTADOR,
      },
    ],
  },
  {
    titulo: 'Administração',
    itens: [
      { nome: 'Contadores', caminho: '/contabil/contadores', icone: Users, papeis: PAPEIS_PLATAFORMA, recurso: 'contadores' },
      { nome: 'Empresas (todas)', caminho: '/contabil/empresas-todas', icone: LayoutDashboard, papeis: PAPEIS_PLATAFORMA, recurso: 'empresas_todas' },
      { nome: 'Planos de Créditos', caminho: '/admin/planos', icone: CreditCard, papeis: PAPEIS_PLATAFORMA, recurso: 'planos_credito' },
      { nome: 'Pacotes de Crédito Avulso', caminho: '/admin/creditos-avulsos', icone: Coins, papeis: PAPEIS_PLATAFORMA, recurso: 'creditos_avulsos' },
      // "Usuários"/"Bater Ponto"/"Folha de Ponto" aparecem 2x -- contador/plataforma usam
      // pro PRÓPRIO time (nunca depende de módulo de empresa-cliente nenhuma), empresa usa
      // pro time dela (aí sim trava por módulo do plano assinado). Um usuário só bate com
      // UM dos papeis de cada par, nunca os dois -- sem colisão de key em runtime.
      { nome: 'Usuários', caminho: '/admin/usuarios', icone: UserCog, papeis: ['SUPER_ADMIN', 'CONTADOR_DONO'] },
      { nome: 'Usuários', caminho: '/admin/usuarios', icone: UserCog, papeis: ['EMPRESARIO_DONO'], modulo: 'usuarios' },
      { nome: 'Papéis e Permissões', caminho: '/admin/papeis', icone: ShieldCheck, papeis: ['SUPER_ADMIN', 'CONTADOR_DONO', 'EMPRESARIO_DONO'] },
      { nome: 'Configurações', caminho: '/configuracoes', icone: Settings, papeis: ['SUPER_ADMIN', 'ADMIN_FINANCEIRO'], recurso: 'configuracoes' },
      { nome: 'Bater Ponto', caminho: '/ponto-eletronico', icone: Clock, papeis: ['OPERADOR_CONTADOR'], recurso: 'ponto_eletronico' },
      { nome: 'Bater Ponto', caminho: '/ponto-eletronico', icone: Clock, papeis: ['OPERADOR_EMPRESA'], modulo: 'ponto_eletronico', recurso: 'ponto_eletronico' },
      {
        nome: 'Folha de Ponto',
        caminho: '/folha-ponto',
        icone: Clock,
        papeis: ['SUPER_ADMIN', 'ADMIN_FINANCEIRO', 'ADMIN_SUPORTE', 'CONTADOR_DONO'],
        recurso: 'folha_ponto',
      },
      {
        nome: 'Folha de Ponto',
        caminho: '/folha-ponto',
        icone: Clock,
        papeis: ['EMPRESARIO_DONO'],
        modulo: 'ponto_eletronico',
      },
    ],
  },
];

interface MenuLateralProps {
  onLinkClick?: () => void;
}

export default function MenuLateral({ onLinkClick }: MenuLateralProps) {
  const localizacao = useLocation();
  const { temModulo } = useModulosLicenciados();
  const { usuario } = useSelector((state: any) => state.autenticacao);
  const ehEmpresa = usuario?.papel === 'EMPRESARIO_DONO' || usuario?.papel === 'OPERADOR_EMPRESA';
  const restrito = PAPEIS_RESTRITOS_POR_PERMISSAO.includes(usuario?.papel);

  // null enquanto não sabe (carregando ou não-restrito) -- itens com `recurso` ficam
  // ocultos até resolver, nunca aparecem "de relance" pra depois desaparecer.
  const [minhasPermissoes, setMinhasPermissoes] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!restrito || !usuario?.id) {
      setMinhasPermissoes(null);
      return;
    }
    listarPermissoesUsuario(usuario.id)
      .then((dados: any) => setMinhasPermissoes(new Set(dados.concedidas.map((p: any) => p.chave))))
      .catch(() => setMinhasPermissoes(new Set()));
  }, [restrito, usuario?.id]);

  function temAcessoAoItem(item: ItemMenu): boolean {
    if (!item.recurso || !restrito) return true;
    return minhasPermissoes?.has(`${item.recurso}:visualizar`) ?? false;
  }

  return (
    <nav className="flex h-full flex-col overflow-y-auto py-4">
      <div className="px-4 pb-4">
        <span className="text-lg font-bold text-primary">{ehEmpresa ? 'JOTA FISCAL' : 'JOTA CONTÁBIL'}</span>
      </div>
      {SECOES_MENU.map((secao) => {
        const itensVisiveis = secao.itens.filter(
          (item) =>
            (!item.modulo || temModulo(item.modulo)) &&
            (!item.papeis || item.papeis.includes(usuario?.papel)) &&
            temAcessoAoItem(item),
        );
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
