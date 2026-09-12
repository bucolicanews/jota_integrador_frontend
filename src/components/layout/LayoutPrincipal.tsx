import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import Header from './Header';
import { useAutenticacao } from '../../hooks/useAutenticacao';
import { useEmpresaAtiva } from '../../hooks/useEmpresaAtiva';

interface LayoutPrincipalProps {
  children: ReactNode;
}

export default function LayoutPrincipal({ children }: LayoutPrincipalProps) {
  const { carregando } = useAutenticacao();
  const { precisaSelecionarEmpresa, carregandoCarteira } = useEmpresaAtiva();

  if (carregando) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 md:p-8">
        {precisaSelecionarEmpresa ? (
          <div className="mx-auto max-w-md rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            {carregandoCarteira ? 'Carregando carteira de empresas...' : 'Selecione uma empresa no topo da página pra continuar.'}
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
