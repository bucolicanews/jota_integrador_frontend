import { useEffect, useState } from 'react';
import { Loader2, PlusCircle, TrendingUp } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import FormMovimentacaoDireta from '../components/formularios/FormMovimentacaoDireta';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { obterFluxoCaixa } from '../servicos/relatorios';
import { listarPlanoContas } from '../servicos/planoContas';
import { showError } from '../utils/toast';

const ROTULO_ORIGEM: Record<string, string> = {
  manual: 'Manual',
  contas_a_pagar: 'Contas a pagar',
  contas_a_receber: 'Contas a receber',
  contrato: 'Contrato',
  conciliacao_bancaria: 'Conciliação bancária',
  estorno: 'Estorno',
};

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
const formatarData = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR') : '—');

function inicioDoMes(): string {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
}
function fimDoMes(): string {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export default function FluxoCaixa() {
  const { empresaId } = useEmpresaAtiva();
  const [dataInicio, setDataInicio] = useState(inicioDoMes());
  const [dataFim, setDataFim] = useState(fimDoMes());
  const [dados, setDados] = useState<any | null>(null);
  const [contas, setContas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);

  function carregar() {
    if (!empresaId || !dataInicio || !dataFim) return;
    setCarregando(true);
    Promise.all([obterFluxoCaixa(empresaId, dataInicio, dataFim), listarPlanoContas(empresaId)])
      .then(([fluxo, planoContas]) => {
        setDados(fluxo);
        setContas(planoContas);
      })
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, [empresaId, dataInicio, dataFim]);

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <TrendingUp className="mr-2 h-6 w-6" /> Fluxo de Caixa
        </h1>
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <Button onClick={() => setDialogAberto(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nova movimentação
          </Button>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova movimentação</DialogTitle>
            </DialogHeader>
            <FormMovimentacaoDireta
              empresaId={empresaId}
              contas={contas}
              onSaveComplete={() => {
                setDialogAberto(false);
                carregar();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardContent className="flex items-end gap-3 pt-6">
          <div>
            <Label className="mb-1 block text-xs">De</Label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Até</Label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
          </div>
        </CardContent>
      </Card>

      {!dados ? (
        <div className="flex justify-center py-8">{carregando && <Loader2 className="h-6 w-6 animate-spin text-primary" />}</div>
      ) : dados.contas.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma conta marcada como "Caixa/Banco" no Plano de Contas ainda.
        </p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dados.contas.map((c: any) => (
              <Card key={c.contaId}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{c.codigo} — {c.nome}</p>
                  <p className={cn('mt-1 text-lg font-bold', c.saldoFinal < 0 && 'text-destructive')}>{formatarMoeda(c.saldoFinal)}</p>
                </CardContent>
              </Card>
            ))}
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Saldo consolidado</p>
                <p className={cn('mt-1 text-lg font-bold', dados.totalSaldoFinal < 0 && 'text-destructive')}>{formatarMoeda(dados.totalSaldoFinal)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Movimentações ({dados.movimentos.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Data</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Histórico</TableHead>
                      <TableHead className="w-[130px]">Origem</TableHead>
                      <TableHead className="text-right">Entrada</TableHead>
                      <TableHead className="text-right">Saída</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dados.movimentos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Nenhuma movimentação no período.</TableCell>
                      </TableRow>
                    ) : (
                      dados.movimentos.map((mov: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{formatarData(mov.dataCompetencia)}</TableCell>
                          <TableCell className="text-sm">{mov.contaNome}</TableCell>
                          <TableCell className="text-sm">{mov.historico}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{ROTULO_ORIGEM[mov.origem] ?? mov.origem}</TableCell>
                          <TableCell className="text-right font-mono">{mov.tipo === 'debito' ? formatarMoeda(mov.valor) : '-'}</TableCell>
                          <TableCell className="text-right font-mono">{mov.tipo === 'credito' ? formatarMoeda(mov.valor) : '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </LayoutPrincipal>
  );
}
