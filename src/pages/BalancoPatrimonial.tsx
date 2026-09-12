import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Scale, XCircle } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { obterBalancoPatrimonial } from '../servicos/relatorios';
import { listarPlanoContas } from '../servicos/planoContas';
import { calcularNivel } from '../utils/hierarquiaContas';
import { showError } from '../utils/toast';

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);

function fimDoMes(): string {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function BlocoContas({ titulo, linhas, mapaContas, totalRotulo, total }: { titulo: string; linhas: any[]; mapaContas: Map<string, any>; totalRotulo: string; total: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableBody>
            {linhas.map((conta) => {
              const nivel = calcularNivel(conta.contaId, mapaContas);
              const sintetica = mapaContas.get(conta.contaId)?.sintetica;
              return (
                <TableRow key={conta.contaId} className={cn(sintetica && 'bg-muted/40 font-semibold')}>
                  <TableCell className="font-mono text-xs" style={{ paddingLeft: `${(nivel - 1) * 14 + 12}px` }}>
                    {conta.codigo}
                  </TableCell>
                  <TableCell className="text-sm">{conta.nome}</TableCell>
                  <TableCell className={cn('text-right font-mono text-sm', conta.saldoFinal < 0 && 'text-destructive')}>{formatarMoeda(conta.saldoFinal)}</TableCell>
                </TableRow>
              );
            })}
            <TableRow className="border-t-2 bg-primary/5 font-bold">
              <TableCell colSpan={2}>{totalRotulo}</TableCell>
              <TableCell className="text-right font-mono">{formatarMoeda(total)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function BalancoPatrimonial() {
  const { empresaId } = useEmpresaAtiva();
  const [dataFim, setDataFim] = useState(fimDoMes());
  const [somenteComSaldo, setSomenteComSaldo] = useState(true);
  const [dados, setDados] = useState<any | null>(null);
  const [contas, setContas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!empresaId || !dataFim) return;
    setCarregando(true);
    Promise.all([obterBalancoPatrimonial(empresaId, dataFim), listarPlanoContas(empresaId)])
      .then(([balanco, planoContas]) => {
        setDados(balanco);
        setContas(planoContas);
      })
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }, [empresaId, dataFim]);

  const mapaContas = useMemo(() => new Map(contas.map((c) => [c.id, c])), [contas]);

  const filtrar = (grupo: string) =>
    (dados?.contas ?? []).filter((c: any) => c.grupo === grupo && (!somenteComSaldo || Math.abs(c.saldoFinal) >= 0.01));

  const contasAtivo = filtrar('ativo');
  const contasPassivoPl = [...filtrar('passivo'), ...filtrar('patrimonio_liquido')];

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <h1 className="mb-6 flex items-center text-2xl font-bold md:text-3xl">
        <Scale className="mr-2 h-6 w-6" /> Balanço Patrimonial
      </h1>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center">
          <div>
            <Label className="mb-1 block text-xs">Data final</Label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-secondary/40 p-3">
            <Checkbox checked={somenteComSaldo} onCheckedChange={(v) => setSomenteComSaldo(Boolean(v))} id="somente-saldo" />
            <Label htmlFor="somente-saldo" className="text-sm">Exibir somente contas com saldo (≠ R$ 0,00)</Label>
          </div>
          {dados && (
            <div className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium', dados.fechado ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
              {dados.fechado ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {dados.fechado ? 'Balanço fechado' : 'Balanço não fecha'}
            </div>
          )}
        </CardContent>
      </Card>

      {!dados ? (
        <div className="flex justify-center py-8">{carregando && <Loader2 className="h-6 w-6 animate-spin text-primary" />}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BlocoContas titulo="Ativo" linhas={contasAtivo} mapaContas={mapaContas} totalRotulo="Total do Ativo" total={dados.totalAtivo} />
            <div className="space-y-4">
              <BlocoContas titulo="Passivo + Patrimônio Líquido" linhas={contasPassivoPl} mapaContas={mapaContas} totalRotulo="Subtotal" total={dados.totalPassivo + dados.totalPatrimonioLiquido} />
              <Card>
                <CardContent className="flex items-center justify-between p-4 text-sm">
                  <span className="text-muted-foreground">Resultado do exercício (Receita − Custo − Despesa, acumulado)</span>
                  <span className={cn('font-mono font-semibold', dados.resultadoLiquido < 0 && 'text-destructive')}>{formatarMoeda(dados.resultadoLiquido)}</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center justify-between p-4 font-bold">
                  <span>Total Passivo + PL</span>
                  <span className="font-mono">{formatarMoeda(dados.totalPassivoPl)}</span>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </LayoutPrincipal>
  );
}
