import { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Banknote, Loader2, Scale, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { listarBancos } from '../../servicos/bancos';
import { obterSaldoConta } from '../../servicos/lancamentos';
import { listarContasReceber } from '../../servicos/contasAReceber';
import { listarContasPagar } from '../../servicos/contasAPagar';

const CORES = { receber: '#00C49F', pagar: '#FF8042' };

const formatarMoeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

function TooltipGrafico({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-card p-2 text-sm shadow-lg">
      <p className="font-bold">{payload[0].payload.name}</p>
      <p style={{ color: payload[0].payload.fill }}>{formatarMoeda(payload[0].value)}</p>
    </div>
  );
}

/**
 * Versão enxuta do DashboardFinanceiro do jotaCaixa -- KPIs + 2 gráficos (não os 3+debug
 * do original). Contas a Pagar/Receber/Bancos são núcleo (nunca gated por licença), então
 * este dashboard aparece pra todo mundo com uma empresa ativa, sem checagem de módulo.
 */
export default function DashboardFinanceiro({ empresaId }: { empresaId: string }) {
  const [carregando, setCarregando] = useState(true);
  const [contasComSaldo, setContasComSaldo] = useState<{ nome: string; saldo: number }[]>([]);
  const [totalSaldo, setTotalSaldo] = useState(0);
  const [totalReceber30, setTotalReceber30] = useState(0);
  const [totalPagar30, setTotalPagar30] = useState(0);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      try {
        const hoje = new Date();
        const em30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

        const [bancos, contasReceber, contasPagar] = await Promise.all([
          listarBancos(empresaId, true),
          listarContasReceber(empresaId),
          listarContasPagar(empresaId),
        ]);

        const saldosPorBanco = await Promise.all(
          bancos.map((banco: any) =>
            obterSaldoConta(empresaId, banco.contaContabilId)
              .then((r: any) => ({ nome: banco.nome, saldo: r.saldo }))
              .catch(() => ({ nome: banco.nome, saldo: 0 })),
          ),
        );
        if (cancelado) return;

        const somaPendentesNoPrazo = (contas: any[]) =>
          contas
            .flatMap((c) => c.parcelas)
            .filter((p: any) => ['aberta', 'parcial'].includes(p.status))
            .filter((p: any) => {
              const vencimento = new Date(`${p.dataVencimento}T00:00:00`);
              return vencimento >= hoje && vencimento <= em30Dias;
            })
            .reduce((soma: number, p: any) => soma + (p.valorParcela - (p.valorRecebido ?? 0)), 0);

        setContasComSaldo(saldosPorBanco.filter((c) => Math.abs(c.saldo) > 0.01));
        setTotalSaldo(saldosPorBanco.reduce((soma, c) => soma + c.saldo, 0));
        setTotalReceber30(somaPendentesNoPrazo(contasReceber));
        setTotalPagar30(
          contasPagar
            .flatMap((c: any) => c.parcelas)
            .filter((p: any) => ['aberta', 'parcial'].includes(p.status))
            .filter((p: any) => {
              const vencimento = new Date(`${p.dataVencimento}T00:00:00`);
              return vencimento >= hoje && vencimento <= em30Dias;
            })
            .reduce((soma: number, p: any) => soma + (p.valorParcela - (p.valorPago ?? 0)), 0),
        );
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [empresaId]);

  if (carregando) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const resultadoPrevisto = totalReceber30 - totalPagar30;
  const saldoData = contasComSaldo.map((c) => ({ name: c.nome, saldo: c.saldo, fill: c.saldo >= 0 ? '#0088FE' : '#FF8042' }));
  const fluxoData = [
    { name: 'A Receber (30 dias)', valor: totalReceber30, fill: CORES.receber },
    { name: 'A Pagar (30 dias)', valor: totalPagar30, fill: CORES.pagar },
  ];

  return (
    <div className="mb-8 space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={cn('border-l-4', totalSaldo >= 0 ? 'border-green-500' : 'border-red-500')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center text-sm font-medium">
              <Banknote className="mr-2 h-4 w-4" /> Saldo Total (Contas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', totalSaldo >= 0 ? 'text-green-600' : 'text-red-600')}>{formatarMoeda(totalSaldo)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center text-sm font-medium">
              <ArrowUpCircle className="mr-2 h-4 w-4" /> A Receber (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatarMoeda(totalReceber30)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center text-sm font-medium">
              <ArrowDownCircle className="mr-2 h-4 w-4" /> A Pagar (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatarMoeda(totalPagar30)}</div>
          </CardContent>
        </Card>
        <Card className={cn('border-l-4', resultadoPrevisto >= 0 ? 'border-green-500' : 'border-red-500')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center text-sm font-medium">
              <TrendingUp className="mr-2 h-4 w-4" /> Resultado Previsto (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', resultadoPrevisto >= 0 ? 'text-green-600' : 'text-red-600')}>{formatarMoeda(resultadoPrevisto)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Scale className="mr-2 h-5 w-5" /> Saldo por Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {saldoData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={saldoData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis dataKey="name" stroke="hsl(var(--foreground))" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={formatarMoeda} stroke="hsl(var(--foreground))" />
                  <Tooltip content={<TooltipGrafico />} />
                  <Bar dataKey="saldo" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Nenhuma conta com saldo registrado.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <TrendingUp className="mr-2 h-5 w-5" /> A Receber vs A Pagar (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fluxoData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="name" stroke="hsl(var(--foreground))" />
                <YAxis tickFormatter={formatarMoeda} stroke="hsl(var(--foreground))" />
                <Tooltip content={<TooltipGrafico />} />
                <Bar dataKey="valor" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
