import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, BadgeDollarSign, Undo2, XCircle, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  obterContaPagar,
  registrarPagamento,
  listarPagamentosDaParcela,
  estornarPagamento,
  cancelarContaPagar,
} from '../../servicos/contasAPagar';
import { showError, showSuccess } from '../../utils/toast';

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
const formatarData = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR') : '—');
const hoje = () => new Date().toISOString().slice(0, 10);

const ROTULO_STATUS: Record<string, { texto: string; variante: 'success' | 'warning' | 'secondary' | 'destructive' }> = {
  aberta: { texto: 'Aberta', variante: 'secondary' },
  parcial: { texto: 'Parcial', variante: 'warning' },
  paga: { texto: 'Paga', variante: 'success' },
  cancelada: { texto: 'Cancelada', variante: 'destructive' },
};

interface Conta {
  id: string;
  codigo: string;
  nome: string;
}

interface DetalheContaPagarDialogProps {
  empresaId: string;
  contaId: string | null;
  contasCaixaBanco: Conta[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMudou: () => void;
}

export default function DetalheContaPagarDialog({ empresaId, contaId, contasCaixaBanco, open, onOpenChange, onMudou }: DetalheContaPagarDialogProps) {
  const [conta, setConta] = useState<any | null>(null);
  const [carregando, setCarregando] = useState(false);

  const [parcelaParaPagar, setParcelaParaPagar] = useState<any | null>(null);
  const [valorPago, setValorPago] = useState('');
  const [dataPagamento, setDataPagamento] = useState(hoje());
  const [contaBancariaId, setContaBancariaId] = useState('');
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);

  const [parcelaParaHistorico, setParcelaParaHistorico] = useState<any | null>(null);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [carregandoPagamentos, setCarregandoPagamentos] = useState(false);
  const [motivoEstorno, setMotivoEstorno] = useState<Record<string, string>>({});
  const [estornando, setEstornando] = useState<string | null>(null);

  const [cancelando, setCancelando] = useState(false);

  function carregar() {
    if (!open || !contaId) return;
    setCarregando(true);
    obterContaPagar(empresaId, contaId)
      .then(setConta)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [open, contaId, empresaId]);

  function abrirPagamento(parcela: any) {
    const restante = Math.round((parcela.valorParcela - parcela.valorPago) * 100) / 100;
    setParcelaParaPagar(parcela);
    setValorPago(String(restante));
    setDataPagamento(hoje());
    setContaBancariaId(contasCaixaBanco[0]?.id ?? '');
  }

  async function confirmarPagamento() {
    if (!parcelaParaPagar || !contaBancariaId || !valorPago) {
      showError('Preencha conta bancária e valor.');
      return;
    }
    setSalvandoPagamento(true);
    try {
      await registrarPagamento(empresaId, parcelaParaPagar.id, {
        contaBancariaId,
        valorPago: Number(valorPago),
        dataPagamento,
      });
      showSuccess('Pagamento registrado.');
      setParcelaParaPagar(null);
      carregar();
      onMudou();
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível registrar o pagamento');
    } finally {
      setSalvandoPagamento(false);
    }
  }

  function abrirHistorico(parcela: any) {
    setParcelaParaHistorico(parcela);
    setCarregandoPagamentos(true);
    listarPagamentosDaParcela(empresaId, parcela.id)
      .then(setPagamentos)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregandoPagamentos(false));
  }

  async function confirmarEstorno(pagamentoId: string) {
    const motivo = motivoEstorno[pagamentoId]?.trim();
    if (!motivo || motivo.length < 2) {
      showError('Informe o motivo do estorno (mínimo 2 caracteres).');
      return;
    }
    setEstornando(pagamentoId);
    try {
      await estornarPagamento(empresaId, pagamentoId, motivo);
      showSuccess('Pagamento estornado.');
      if (parcelaParaHistorico) abrirHistorico(parcelaParaHistorico);
      carregar();
      onMudou();
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível estornar o pagamento');
    } finally {
      setEstornando(null);
    }
  }

  async function aoCancelarConta() {
    if (!contaId) return;
    setCancelando(true);
    try {
      await cancelarContaPagar(empresaId, contaId);
      showSuccess('Conta cancelada.');
      carregar();
      onMudou();
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível cancelar a conta');
    } finally {
      setCancelando(false);
    }
  }

  const progresso = conta && conta.valorTotal > 0 ? Math.round((conta.valorPago / conta.valorTotal) * 100) : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md md:max-w-[85%]">
          <DialogHeader>
            <DialogTitle>Detalhes da conta a pagar</DialogTitle>
            {conta && (
              <DialogDescription>
                {conta.descricao} — <span className="font-medium text-foreground">{conta.fornecedor}</span>
              </DialogDescription>
            )}
          </DialogHeader>

          {carregando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : conta ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progresso de pagamento</span>
                    <span className="text-sm font-bold text-primary">{progresso}%</span>
                  </div>
                  <Progress value={progresso} className="h-2" />
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-medium">{formatarMoeda(conta.valorTotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-red-600">Pago</p>
                      <p className="font-medium text-red-600">{formatarMoeda(conta.valorPago)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Restante</p>
                      <p className="font-medium">{formatarMoeda(conta.valorTotal - conta.valorPago)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="max-h-[45vh] overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Nº</TableHead>
                      <TableHead className="w-[100px]">Vencimento</TableHead>
                      <TableHead className="w-[100px] text-right">Valor</TableHead>
                      <TableHead className="w-[100px] text-right">Pago</TableHead>
                      <TableHead className="w-[90px]">Status</TableHead>
                      <TableHead className="w-[140px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conta.parcelas.map((p: any) => (
                      <TableRow key={p.id} className={cn(p.status === 'paga' && 'bg-green-500/5', p.status === 'cancelada' && 'opacity-60')}>
                        <TableCell className="font-medium">{p.numeroParcela}</TableCell>
                        <TableCell className="text-xs">{formatarData(p.dataVencimento)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatarMoeda(p.valorParcela)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatarMoeda(p.valorPago)}</TableCell>
                        <TableCell>
                          <Badge variant={ROTULO_STATUS[p.status].variante}>{ROTULO_STATUS[p.status].texto}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {(p.status === 'aberta' || p.status === 'parcial') && (
                              <Button size="sm" variant="outline" className="h-8" onClick={() => abrirPagamento(p)}>
                                <BadgeDollarSign className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {p.valorPago > 0 && (
                              <Button size="sm" variant="ghost" className="h-8" onClick={() => abrirHistorico(p)} title="Histórico de pagamentos">
                                <History className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {conta.status !== 'cancelada' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={conta.valorPago > 0 || cancelando}>
                      <XCircle className="mr-2 h-4 w-4" /> Cancelar conta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar esta conta a pagar?</AlertDialogTitle>
                      <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction onClick={aoCancelarConta}>{cancelando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar cancelamento'}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {conta.valorPago > 0 && conta.status !== 'cancelada' && (
                <p className="text-xs text-muted-foreground">Estorne todos os pagamentos antes de cancelar esta conta.</p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={parcelaParaPagar !== null} onOpenChange={(o) => !o && setParcelaParaPagar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
            {parcelaParaPagar && <DialogDescription>Parcela {parcelaParaPagar.numeroParcela} — restante {formatarMoeda(parcelaParaPagar.valorParcela - parcelaParaPagar.valorPago)}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Conta bancária *</Label>
              <select value={contaBancariaId} onChange={(e) => setContaBancariaId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {contasCaixaBanco.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor pago *</Label>
                <Input type="number" step="0.01" min="0.01" value={valorPago} onChange={(e) => setValorPago(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={confirmarPagamento} disabled={salvandoPagamento || contasCaixaBanco.length === 0}>
              {salvandoPagamento && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar pagamento
            </Button>
            {contasCaixaBanco.length === 0 && <p className="text-xs text-destructive">Nenhuma conta marcada como Caixa/Banco no Plano de Contas.</p>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={parcelaParaHistorico !== null} onOpenChange={(o) => !o && setParcelaParaHistorico(null)}>
        <DialogContent className="max-w-md md:max-w-[70%]">
          <DialogHeader>
            <DialogTitle>Histórico de pagamentos</DialogTitle>
            {parcelaParaHistorico && <DialogDescription>Parcela {parcelaParaHistorico.numeroParcela}</DialogDescription>}
          </DialogHeader>
          {carregandoPagamentos ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {pagamentos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>}
              {pagamentos.map((pg) => (
                <div key={pg.id} className={cn('flex items-center justify-between gap-2 rounded-md border p-2', pg.estornado && 'opacity-50')}>
                  <div className="text-sm">
                    <p className="font-medium">{formatarMoeda(pg.valorPago)}</p>
                    <p className="text-xs text-muted-foreground">{formatarData(pg.dataPagamento)}</p>
                  </div>
                  {pg.estornado ? (
                    <Badge variant="destructive">Estornado</Badge>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Input
                        placeholder="Motivo do estorno"
                        className="h-8 w-40 text-xs"
                        value={motivoEstorno[pg.id] ?? ''}
                        onChange={(e) => setMotivoEstorno((prev) => ({ ...prev, [pg.id]: e.target.value }))}
                      />
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => confirmarEstorno(pg.id)} disabled={estornando === pg.id}>
                        {estornando === pg.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
