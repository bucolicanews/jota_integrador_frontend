import { CreditCard } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import CardMinhaAssinatura from '../components/empresas/CardMinhaAssinatura';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';

/** Tela própria pro empresário ver o plano que está e renovar quando vencer -- antes vivia embutida em paginas/fiscal. */
export default function MinhaAssinatura() {
  const { empresaId } = useEmpresaAtiva();

  return (
    <LayoutPrincipal>
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 flex items-center text-2xl font-bold md:text-3xl">
          <CreditCard className="mr-2 h-6 w-6" /> Minha Assinatura
        </h1>

        {!empresaId ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Carregando...</CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <CardMinhaAssinatura empresaId={empresaId} />
            </CardContent>
          </Card>
        )}
      </div>
    </LayoutPrincipal>
  );
}
