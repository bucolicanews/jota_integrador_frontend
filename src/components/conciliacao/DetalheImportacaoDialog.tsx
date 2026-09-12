import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { obterDetalheImportacao } from '../../servicos/conciliacaoBancaria';
import { showError } from '../../utils/toast';

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
const formatarData = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR') : '—');

const ROTULO_STATUS: Record<string, { texto: string; variante: 'success' | 'warning' | 'secondary' | 'destructive' }> = {
  pendente: { texto: 'Pendente', variante: 'warning' },
  conciliada: { texto: 'Conciliada', variante: 'success' },
  duplicada: { texto: 'Duplicada', variante: 'secondary' },
  ignorada: { texto: 'Ignorada', variante: 'destructive' },
};

interface DetalheImportacaoDialogProps {
  empresaId: string;
  importacaoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DetalheImportacaoDialog({ empresaId, importacaoId, open, onOpenChange }: DetalheImportacaoDialogProps) {
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!open || !importacaoId) return;
    setCarregando(true);
    obterDetalheImportacao(empresaId, importacaoId)
      .then(setDetalhe)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }, [open, importacaoId, empresaId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md md:max-w-[85%]">
        <DialogHeader>
          <DialogTitle>Detalhes da importação</DialogTitle>
          {detalhe && (
            <DialogDescription>
              Arquivo: <span className="font-mono text-primary">{detalhe.importacao.nomeArquivo}</span> — {formatarData(detalhe.importacao.criadoEm?.slice(0, 10))}
            </DialogDescription>
          )}
        </DialogHeader>

        {carregando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !detalhe ? null : (
          <div className="max-h-[70vh] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[90px]">Data</TableHead>
                  <TableHead className="min-w-[160px]">Descrição</TableHead>
                  <TableHead className="w-[90px]">Tipo</TableHead>
                  <TableHead className="w-[110px] text-right">Valor</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalhe.transacoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Nenhuma transação nesta importação.
                    </TableCell>
                  </TableRow>
                ) : (
                  detalhe.transacoes.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs">{formatarData(t.dataCompetencia)}</TableCell>
                      <TableCell className="text-sm">{t.descricao}</TableCell>
                      <TableCell>
                        <Badge variant={t.tipo === 'Entrada' ? 'success' : 'destructive'} className="flex w-fit items-center gap-1">
                          {t.tipo === 'Entrada' ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                          {t.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn('text-right font-mono text-sm', t.tipo === 'Entrada' ? 'text-green-600' : 'text-red-600')}>
                        {formatarMoeda(t.valor)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ROTULO_STATUS[t.status].variante}>{ROTULO_STATUS[t.status].texto}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
