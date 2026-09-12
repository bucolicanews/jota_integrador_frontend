import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2 } from 'lucide-react';
import { buscarParcelasCandidatas, vincularParcela } from '../../servicos/conciliacaoBancaria';
import { showError, showSuccess } from '../../utils/toast';

const ROTULO_COMPATIBILIDADE: Record<string, { texto: string; variante: 'success' | 'warning' | 'secondary' }> = {
  alta: { texto: 'Match exato', variante: 'success' },
  media: { texto: 'Provável', variante: 'warning' },
  baixa: { texto: 'Possível', variante: 'secondary' },
};

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
const formatarData = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR') : '—');

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'Entrada' | 'Saida';
}

interface ParcelaCandidata {
  parcelaId: string;
  tipo: 'CP' | 'CR';
  descricao: string;
  numeroParcela: number;
  valorRestante: number;
  dataVencimento: string;
  compatibilidade: 'alta' | 'media' | 'baixa';
}

interface ModalParcelasCandidatasProps {
  empresaId: string;
  transacao: Transacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVinculado: (transacaoId: string) => void;
}

export default function ModalParcelasCandidatas({ empresaId, transacao, open, onOpenChange, onVinculado }: ModalParcelasCandidatasProps) {
  const [candidatos, setCandidatos] = useState<ParcelaCandidata[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [vinculando, setVinculando] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !transacao) return;
    setCarregando(true);
    buscarParcelasCandidatas(empresaId, transacao.id)
      .then(setCandidatos)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }, [open, transacao, empresaId]);

  async function aoVincular(candidato: ParcelaCandidata) {
    if (!transacao) return;
    setVinculando(candidato.parcelaId);
    try {
      await vincularParcela(empresaId, transacao.id, { parcelaId: candidato.parcelaId, tipo: candidato.tipo });
      showSuccess('Transação vinculada e parcela quitada com sucesso.');
      onVinculado(transacao.id);
      onOpenChange(false);
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível vincular a parcela');
    } finally {
      setVinculando(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md md:max-w-[85%]">
        <DialogHeader>
          <DialogTitle>Vincular parcela</DialogTitle>
          <DialogDescription>
            {transacao ? (
              <>
                {transacao.descricao} — <span className="font-mono">{formatarMoeda(transacao.valor)}</span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {carregando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : candidatos.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhuma parcela em aberto de {transacao?.tipo === 'Saida' ? 'Contas a Pagar' : 'Contas a Receber'} encontrada. Use a categorização direta abaixo.
          </p>
        ) : (
          <div className="max-h-[400px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[70px]">Parcela</TableHead>
                  <TableHead className="w-[110px] text-right">Restante</TableHead>
                  <TableHead className="w-[100px]">Vencimento</TableHead>
                  <TableHead className="w-[110px]">Compatibilidade</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidatos.map((c) => (
                  <TableRow key={c.parcelaId}>
                    <TableCell className="text-sm">{c.descricao}</TableCell>
                    <TableCell className="text-xs">{c.numeroParcela}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatarMoeda(c.valorRestante)}</TableCell>
                    <TableCell className="text-xs">{formatarData(c.dataVencimento)}</TableCell>
                    <TableCell>
                      <Badge variant={ROTULO_COMPATIBILIDADE[c.compatibilidade].variante}>{ROTULO_COMPATIBILIDADE[c.compatibilidade].texto}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => aoVincular(c)} disabled={vinculando !== null}>
                        {vinculando === c.parcelaId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
