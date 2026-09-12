import { useEffect, useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { obterRazao } from '../servicos/relatorios';
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

export default function Razao() {
  const { empresaId } = useEmpresaAtiva();
  const [dataInicio, setDataInicio] = useState(inicioDoMes());
  const [dataFim, setDataFim] = useState(fimDoMes());
  const [contaSelecionada, setContaSelecionada] = useState('todos');
  const [contasAnaliticas, setContasAnaliticas] = useState<any[]>([]);
  const [contas, setContas] = useState<any[] | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!empresaId) return;
    listarPlanoContas(empresaId)
      .then((lista) => setContasAnaliticas(lista.filter((c: any) => !c.sintetica && c.ativa)))
      .catch((erro) => showError(erro.message));
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId || !dataInicio || !dataFim) return;
    setCarregando(true);
    obterRazao(empresaId, dataInicio, dataFim, contaSelecionada === 'todos' ? undefined : contaSelecionada)
      .then(setContas)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }, [empresaId, dataInicio, dataFim, contaSelecionada]);

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <h1 className="mb-6 flex items-center text-2xl font-bold md:text-3xl">
        <BookOpen className="mr-2 h-6 w-6" /> Livro Razão
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
          <div className="w-full max-w-xs">
            <Label className="mb-1 block text-xs">Conta</Label>
            <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as contas analíticas</SelectItem>
                {contasAnaliticas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.codigo} — {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {carregando && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!carregando && contas && contas.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma movimentação no período selecionado.</p>
      )}

      <div className="space-y-6">
        {!carregando &&
          contas?.map((conta) => (
            <Card key={conta.contaId} className="overflow-hidden border-l-4 border-l-primary/50">
              <CardHeader className="bg-muted/20 pb-3">
                <CardTitle className="text-base">
                  {conta.codigo} — {conta.nome}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Data</TableHead>
                      <TableHead className="w-[130px]">Origem</TableHead>
                      <TableHead>Histórico</TableHead>
                      <TableHead className="text-right">Débito</TableHead>
                      <TableHead className="text-right">Crédito</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-secondary/30 font-semibold">
                      <TableCell colSpan={5}>SALDO INICIAL</TableCell>
                      <TableCell className={cn('text-right font-mono', conta.saldoInicial < 0 && 'text-destructive')}>{formatarMoeda(conta.saldoInicial)}</TableCell>
                    </TableRow>
                    {conta.movimentos.map((mov: any, index: number) => (
                      <TableRow key={index} className="text-sm">
                        <TableCell>{formatarData(mov.dataCompetencia)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{ROTULO_ORIGEM[mov.origem] ?? mov.origem}</TableCell>
                        <TableCell>{mov.historico}</TableCell>
                        <TableCell className="text-right font-mono">{mov.tipo === 'debito' ? formatarMoeda(mov.valor) : '-'}</TableCell>
                        <TableCell className="text-right font-mono">{mov.tipo === 'credito' ? formatarMoeda(mov.valor) : '-'}</TableCell>
                        <TableCell className={cn('text-right font-mono', mov.saldoAcumulado < 0 && 'text-destructive')}>{formatarMoeda(mov.saldoAcumulado)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 bg-primary/10 font-bold">
                      <TableCell colSpan={5}>SALDO FINAL</TableCell>
                      <TableCell className={cn('text-right font-mono', conta.saldoFinal < 0 && 'text-destructive')}>{formatarMoeda(conta.saldoFinal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
      </div>
    </LayoutPrincipal>
  );
}
