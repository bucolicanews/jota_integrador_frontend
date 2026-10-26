import { useEffect, useState } from 'react';
import { Coins, Loader2 } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import CardComprarCreditosAvulsos from '../components/empresas/CardComprarCreditosAvulsos';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { obterSaldoCreditos } from '../servicos/creditos';

/**
 * Destino único de "comprar créditos" -- mesmo CardComprarCreditosAvulsos já usado em
 * paginas/fiscal (não duplica lógica, só dá um endereço próprio pro menu lateral e pro
 * indicador de saldo do Header linkarem). Revenda do contador só aparece pra quem é a
 * própria empresa (regra já existe no backend -- CreditosAvulsosController bloqueia
 * contador comprando pacote de revenda em nome da empresa).
 */
export default function Creditos() {
  const { empresaId, ehContador, ehPlataforma, precisaSelecionarEmpresa } = useEmpresaAtiva();
  const [saldo, setSaldo] = useState<number | null>(null);

  useEffect(() => {
    if (!empresaId) return;
    obterSaldoCreditos(empresaId)
      .then((dados) => setSaldo(dados.saldo))
      .catch(() => setSaldo(null));
  }, [empresaId]);

  return (
    <LayoutPrincipal>
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 flex items-center text-2xl font-bold md:text-3xl">
          <Coins className="mr-2 h-6 w-6" /> Créditos
        </h1>

        {precisaSelecionarEmpresa || !empresaId ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Selecione uma empresa no topo da tela pra comprar créditos pra ela.</CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardContent className="flex items-center gap-3 p-6">
                <Coins className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Saldo atual</p>
                  <p className="text-2xl font-bold">{saldo === null ? <Loader2 className="h-5 w-5 animate-spin" /> : saldo}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <CardComprarCreditosAvulsos empresaId={empresaId} permitirRevenda={!ehContador && !ehPlataforma} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </LayoutPrincipal>
  );
}
