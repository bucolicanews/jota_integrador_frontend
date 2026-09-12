import { useEffect, useState } from 'react';
import { Loader2, PlusCircle, HandCoins } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FormNovaContaReceber from '../components/contas-receber/FormNovaContaReceber';
import DetalheContaReceberDialog from '../components/contas-receber/DetalheContaReceberDialog';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarPlanoContas } from '../servicos/planoContas';
import { listarContasReceber } from '../servicos/contasAReceber';
import { listarClientes } from '../servicos/clientes';
import { showError } from '../utils/toast';

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
const formatarData = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR') : '—');

const ROTULO_STATUS: Record<string, { texto: string; variante: 'success' | 'warning' | 'secondary' | 'destructive' }> = {
  aberta: { texto: 'Aberta', variante: 'secondary' },
  parcial: { texto: 'Parcial', variante: 'warning' },
  paga: { texto: 'Recebida', variante: 'success' },
  cancelada: { texto: 'Cancelada', variante: 'destructive' },
};

export default function ContasAReceber() {
  const { empresaId } = useEmpresaAtiva();
  const [contasPlano, setContasPlano] = useState<any[]>([]);
  const [contasCaixaBanco, setContasCaixaBanco] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [dialogNovaContaAberto, setDialogNovaContaAberto] = useState(false);
  const [contaSelecionadaId, setContaSelecionadaId] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaId) return;
    listarPlanoContas(empresaId)
      .then((lista) => {
        setContasPlano(lista);
        setContasCaixaBanco(lista.filter((c: any) => c.contaCaixaBanco && !c.sintetica));
      })
      .catch((erro) => showError(erro.message));
    listarClientes(empresaId, true)
      .then(setClientes)
      .catch((erro) => showError(erro.message));
  }, [empresaId]);

  function carregarContas() {
    if (!empresaId) return;
    setCarregando(true);
    listarContasReceber(empresaId, filtroStatus || undefined)
      .then(setContas)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregarContas, [empresaId, filtroStatus]);

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <HandCoins className="mr-2 h-6 w-6" /> Contas a Receber
        </h1>
        <div className="flex w-full gap-2 sm:w-auto">
          <Select value={filtroStatus || 'todos'} onValueChange={(v) => setFiltroStatus(v === 'todos' ? '' : v)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="aberta">Aberta</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="paga">Recebida</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setDialogNovaContaAberto(true)} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Nova conta
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {carregando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[110px]">Emissão</TableHead>
                    <TableHead className="w-[100px] text-right">Valor</TableHead>
                    <TableHead className="w-[90px] text-center">Parcelas</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Nenhuma conta a receber encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    contas.map((c) => {
                      const pagas = c.parcelas.filter((p: any) => p.status === 'paga').length;
                      return (
                        <TableRow key={c.id} className="cursor-pointer" onClick={() => setContaSelecionadaId(c.id)}>
                          <TableCell className="font-medium">{c.clienteNome}</TableCell>
                          <TableCell className="text-sm">{c.descricao}</TableCell>
                          <TableCell className="text-xs">{formatarData(c.dataEmissao)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatarMoeda(c.valorTotal)}</TableCell>
                          <TableCell className="text-center text-xs">
                            {pagas}/{c.parcelas.length}
                          </TableCell>
                          <TableCell>
                            <Badge variant={ROTULO_STATUS[c.status].variante}>{ROTULO_STATUS[c.status].texto}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogNovaContaAberto} onOpenChange={setDialogNovaContaAberto}>
        <DialogContent className="max-w-md md:max-w-[70%]">
          <DialogHeader>
            <DialogTitle>Nova conta a receber</DialogTitle>
          </DialogHeader>
          <FormNovaContaReceber
            empresaId={empresaId}
            contas={contasPlano}
            clientes={clientes}
            onSaveComplete={() => {
              setDialogNovaContaAberto(false);
              carregarContas();
            }}
          />
        </DialogContent>
      </Dialog>

      <DetalheContaReceberDialog
        empresaId={empresaId}
        contaId={contaSelecionadaId}
        contasCaixaBanco={contasCaixaBanco}
        open={contaSelecionadaId !== null}
        onOpenChange={(open) => {
          if (!open) setContaSelecionadaId(null);
        }}
        onMudou={carregarContas}
      />
    </LayoutPrincipal>
  );
}
