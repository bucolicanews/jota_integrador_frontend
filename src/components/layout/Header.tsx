import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, LogOut, Menu, User, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAutenticacao } from '../../hooks/useAutenticacao';
import { useEmpresaAtiva } from '../../hooks/useEmpresaAtiva';
import { ROTULO_PAPEL } from '../../constantes/papeis';
import { EVENTO_SALDO_CREDITOS_ATUALIZADO, obterSaldoCreditos } from '../../servicos/creditos';
import { obterEmpresa } from '../../servicos/empresas';
import { obterMeuPerfil } from '../../servicos/perfil';
import { supabase } from '../../servicos/supabase';
import { limparUsuario } from '../../store/autenticacaoSlice';
import { useDispatch } from 'react-redux';
import MenuLateral from './MenuLateral';

// Abaixo disso o indicador fica em alerta (amarelo) -- em 0 fica crítico (vermelho). Não
// tem como saber de antemão quanto uma operação vai custar aqui no header (varia por
// tipo de consulta), então é só um aviso visual pra não ser pego de surpresa, não uma
// garantia de que a próxima ação vai passar.
const SALDO_LIMIAR_ALERTA = 5;

function IndicadorCreditos({ empresaId }: { empresaId: string }) {
  const [saldo, setSaldo] = useState<number | null>(null);

  useEffect(() => {
    let cancelado = false;

    function buscar() {
      obterSaldoCreditos(empresaId)
        .then((dados) => {
          if (!cancelado) setSaldo(dados.saldo);
        })
        .catch(() => {
          if (!cancelado) setSaldo(null);
        });
    }

    buscar();
    window.addEventListener(EVENTO_SALDO_CREDITOS_ATUALIZADO, buscar);
    return () => {
      cancelado = true;
      window.removeEventListener(EVENTO_SALDO_CREDITOS_ATUALIZADO, buscar);
    };
  }, [empresaId]);

  if (saldo === null) return null;

  const critico = saldo <= 0;
  const alerta = saldo > 0 && saldo <= SALDO_LIMIAR_ALERTA;

  return (
    <Link
      to="/creditos"
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium transition-opacity hover:opacity-80',
        critico
          ? 'border-red-300 bg-red-50 text-red-700'
          : alerta
            ? 'border-amber-300 bg-amber-50 text-amber-700'
            : 'border-border bg-muted text-foreground',
      )}
      title={critico ? 'Sem créditos disponíveis -- clique pra comprar' : alerta ? 'Créditos baixos -- clique pra comprar' : 'Créditos disponíveis -- clique pra comprar mais'}
    >
      <Coins className="h-4 w-4" />
      <span>{saldo}</span>
      {critico && <span className="hidden sm:inline">· sem créditos</span>}
    </Link>
  );
}

export default function Header() {
  const [sheetAberto, setSheetAberto] = useState(false);
  const { usuario } = useAutenticacao();
  const { empresaId, empresaAtiva, carteira, carregandoCarteira, ehContador, ehPlataforma, selecionarEmpresa } = useEmpresaAtiva();
  // Plataforma resolve pro workspace interno fixo da própria Jota (useEmpresaAtiva.js) --
  // isso NÃO é um saldo de créditos de verdade, admin não compra/consome crédito SERPRO,
  // então o indicador nunca aparece pra esse papel.
  const mostrarIndicadorCreditos = Boolean(empresaId) && !ehPlataforma;
  const dispatch = useDispatch();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [razaoSocialPropria, setRazaoSocialPropria] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    obterMeuPerfil()
      .then((dados) => setAvatarUrl(dados.avatarUrl ?? null))
      .catch(() => setAvatarUrl(null));
  }, [usuario]);

  useEffect(() => {
    // Pro empresário/operador da empresa, a razão social da própria empresa identifica
    // melhor "quem é" do que o papel cru (EMPRESARIO_DONO) -- contador/plataforma não tem
    // "a própria empresa" nesse sentido, mantém o rótulo do papel.
    if (ehContador || ehPlataforma || !empresaId) {
      setRazaoSocialPropria(null);
      return;
    }
    obterEmpresa(empresaId)
      .then((dados) => setRazaoSocialPropria(dados.razaoSocial))
      .catch(() => setRazaoSocialPropria(null));
  }, [ehContador, ehPlataforma, empresaId]);

  const rotuloIdentidade = razaoSocialPropria ?? (usuario ? ROTULO_PAPEL[usuario.papel] ?? usuario.papel : '');

  async function sair() {
    await supabase.auth.signOut();
    dispatch(limparUsuario());
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4 md:px-8',
        'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
      )}
    >
      <div className="flex items-center gap-4">
        <Sheet open={sheetAberto} onOpenChange={setSheetAberto}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menu">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <MenuLateral onLinkClick={() => setSheetAberto(false)} />
          </SheetContent>
        </Sheet>
        <Link to={ehContador || ehPlataforma ? '/contabil' : '/fiscal'} className="text-xl font-bold text-primary">
          {ehContador || ehPlataforma ? 'JOTA CONTÁBIL' : 'JOTA FISCAL'}
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {mostrarIndicadorCreditos && <IndicadorCreditos empresaId={empresaId} />}

        {ehContador && (
          <select
            className="max-w-[220px] rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            value={empresaAtiva?.id ?? ''}
            disabled={carregandoCarteira}
            onChange={(evento) => {
              const empresa = carteira.find((e) => e.id === evento.target.value);
              if (empresa) selecionarEmpresa(empresa);
            }}
          >
            <option value="" disabled>
              {carregandoCarteira ? 'Carregando...' : 'Selecione a empresa'}
            </option>
            {carteira.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.ehPropria ? `${empresa.razaoSocial} (minha contabilidade)` : empresa.razaoSocial}
              </option>
            ))}
          </select>
        )}

        {usuario && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 overflow-hidden rounded-full p-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="truncate text-sm font-medium leading-none">{usuario.email}</p>
                  <p className="truncate text-xs leading-none text-primary">{rotuloIdentidade}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/perfil">
                  <UserCog className="mr-2 h-4 w-4" />
                  Meu Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={sair} className="text-red-500 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
