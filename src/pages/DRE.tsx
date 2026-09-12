import { useEffect, useMemo, useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { obterDre } from '../servicos/relatorios';
import { listarPlanoContas } from '../servicos/planoContas';
import { calcularNivel } from '../utils/hierarquiaContas';
import { showError } from '../utils/toast';

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);

function inicioDoMes(): string {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
}
function fimDoMes(): string {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
}

const ROTULO_GRUPO: Record<string, string> = { receita: 'Receitas', custo: 'Custos', despesa: 'Despesas' };

export default function DRE() {
  const { empresaId } = useEmpresaAtiva();
  const [dataInicio, setDataInicio] = useState(inicioDoMes());
  const [dataFim, setDataFim] = useState(fimDoMes());
  const [somenteComSaldo, setSomenteComSaldo] = useState(true);
  const [dados, setDados] = useState<any | null>(null);
  const [contas, setContas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!empresaId || !dataInicio || !dataFim) return;
    setCarregando(true);
    Promise.all([obterDre(empresaId, dataInicio, dataFim), listarPlanoContas(empresaId)])
      .then(([dre, planoContas]) => {
        setDados(dre);
        setContas(planoContas);
      })
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }, [empresaId, dataInicio, dataFim]);

  const mapaContas = useMemo(() => new Map(contas.map((c) => [c.id, c])), [contas]);

  const porGrupo = (grupo: string) =>
    (dados?.contas ?? []).filter((c: any) => c.grupo === grupo && (!somenteComSaldo || Math.abs(c.valorPeriodo) >= 0.01));

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <h1 className="mb-6 flex items-center text-2xl font-bold md:text-3xl">
        <TrendingUp className="mr-2 h-6 w-6" /> Demonstração do Resultado (DRE)
      </h1>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center">
          <div className="flex items-end gap-3">
            <div>
              <Label className="mb-1 block text-xs">De</Label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Até</Label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-secondary/40 p-3">
            <Checkbox checked={somenteComSaldo} onCheckedChange={(v) => setSomenteComSaldo(Boolean(v))} id="somente-saldo" />
            <Label htmlFor="somente-saldo" className="text-sm">Exibir somente contas com valor no período</Label>
          </div>
        </CardContent>
      </Card>

      {!dados ? (
        <div className="flex justify-center py-8">{carregando && <Loader2 className="h-6 w-6 animate-spin text-primary" />}</div>
      ) : (
        <div className="space-y-4">
          {(['receita', 'custo', 'despesa'] as const).map((grupo) => {
            const linhas = porGrupo(grupo);
            const total = grupo === 'receita' ? dados.totalReceita : grupo === 'custo' ? dados.totalCusto : dados.totalDespesa;
            return (
              <Card key={grupo}>
                <CardHeader>
                  <CardTitle className="text-base">{ROTULO_GRUPO[grupo]}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      {linhas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="py-3 text-center text-sm text-muted-foreground">Nenhuma conta no período.</TableCell>
                        </TableRow>
                      ) : (
                        linhas.map((conta: any) => {
                          const nivel = calcularNivel(conta.contaId, mapaContas);
                          const sintetica = mapaContas.get(conta.contaId)?.sintetica;
                          return (
                            <TableRow key={conta.contaId} className={cn(sintetica && 'bg-muted/40 font-semibold')}>
                              <TableCell className="font-mono text-xs" style={{ paddingLeft: `${(nivel - 1) * 14 + 12}px` }}>{conta.codigo}</TableCell>
                              <TableCell className="text-sm">{conta.nome}</TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatarMoeda(conta.valorPeriodo)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                      <TableRow className="border-t-2 bg-primary/5 font-bold">
                        <TableCell colSpan={2}>Total {ROTULO_GRUPO[grupo]}</TableCell>
                        <TableCell className="text-right font-mono">{formatarMoeda(total)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}

          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="flex items-center justify-between p-4">
              <span className="text-lg font-bold">Resultado líquido do período</span>
              <span className={cn('font-mono text-lg font-bold', dados.resultadoLiquido < 0 && 'text-destructive')}>{formatarMoeda(dados.resultadoLiquido)}</span>
            </CardContent>
          </Card>
        </div>
      )}
    </LayoutPrincipal>
  );
}
