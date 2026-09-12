import { useEffect, useMemo, useState } from 'react';
import { FileTextIcon, Loader2 } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { obterBalancete } from '../servicos/relatorios';
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

export default function Balancete() {
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
    Promise.all([obterBalancete(empresaId, dataInicio, dataFim), listarPlanoContas(empresaId)])
      .then(([balancete, planoContas]) => {
        setDados(balancete);
        setContas(planoContas);
      })
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }, [empresaId, dataInicio, dataFim]);

  const mapaContas = useMemo(() => new Map(contas.map((c) => [c.id, c])), [contas]);

  const linhas = useMemo(() => {
    if (!dados) return [];
    return dados.contas.filter((c: any) => !somenteComSaldo || Math.abs(c.saldoFinal) >= 0.01);
  }, [dados, somenteComSaldo]);

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <h1 className="mb-6 flex items-center text-2xl font-bold md:text-3xl">
        <FileTextIcon className="mr-2 h-6 w-6" /> Balancete de Verificação
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
            <Label htmlFor="somente-saldo" className="text-sm">Exibir somente contas com saldo final (≠ R$ 0,00)</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Contas ({linhas.length})</CardTitle>
          {carregando && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Saldo inicial</TableHead>
                  <TableHead className="text-right">Débito</TableHead>
                  <TableHead className="text-right">Crédito</TableHead>
                  <TableHead className="text-right">Saldo final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!dados ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : linhas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Nenhuma conta encontrada.</TableCell>
                  </TableRow>
                ) : (
                  linhas.map((conta: any) => {
                    const nivel = calcularNivel(conta.contaId, mapaContas);
                    const sintetica = mapaContas.get(conta.contaId)?.sintetica;
                    return (
                      <TableRow key={conta.contaId} className={cn(sintetica && 'bg-muted/40 font-semibold')}>
                        <TableCell className="font-mono text-sm" style={{ paddingLeft: `${(nivel - 1) * 16 + 16}px` }}>
                          {conta.codigo}
                        </TableCell>
                        <TableCell>{conta.nome}</TableCell>
                        <TableCell className="text-right font-mono">{formatarMoeda(conta.saldoInicial)}</TableCell>
                        <TableCell className="text-right font-mono">{formatarMoeda(conta.totalDebito)}</TableCell>
                        <TableCell className="text-right font-mono">{formatarMoeda(conta.totalCredito)}</TableCell>
                        <TableCell className={cn('text-right font-mono', conta.saldoFinal < 0 && 'text-destructive')}>{formatarMoeda(conta.saldoFinal)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              {dados && (
                <tfoot>
                  <TableRow className="border-t-2 bg-primary/5 font-bold">
                    <TableCell colSpan={3}>TOTAIS</TableCell>
                    <TableCell className="text-right font-mono">{formatarMoeda(dados.totalDebito)}</TableCell>
                    <TableCell className="text-right font-mono">{formatarMoeda(dados.totalCredito)}</TableCell>
                    <TableCell className="text-right font-mono">{formatarMoeda(dados.totalSaldoFinal)}</TableCell>
                  </TableRow>
                </tfoot>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </LayoutPrincipal>
  );
}
