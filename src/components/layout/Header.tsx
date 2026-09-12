import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Menu, User, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAutenticacao } from '../../hooks/useAutenticacao';
import { useEmpresaAtiva } from '../../hooks/useEmpresaAtiva';
import { supabase } from '../../servicos/supabase';
import { limparUsuario } from '../../store/autenticacaoSlice';
import { useDispatch } from 'react-redux';
import MenuLateral from './MenuLateral';

export default function Header() {
  const [sheetAberto, setSheetAberto] = useState(false);
  const { usuario } = useAutenticacao();
  const { empresaAtiva, carteira, carregandoCarteira, ehContador, selecionarEmpresa } = useEmpresaAtiva();
  const dispatch = useDispatch();

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
        <Link to="/contabil" className="text-xl font-bold text-primary">
          JOTA CONTÁBIL
        </Link>
      </div>

      <div className="flex items-center gap-3">
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
                {empresa.razaoSocial}
              </option>
            ))}
          </select>
        )}

        {usuario && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="truncate text-sm font-medium leading-none">{usuario.email}</p>
                  <p className="text-xs leading-none text-primary">{usuario.papel}</p>
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
