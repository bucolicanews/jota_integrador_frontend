import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { cancelarOuMarcarProblema } from '../../servicos/protocolos';
import { showError, showSuccess } from '../../utils/toast';

interface DialogCancelarOuProblemaProps {
  empresaId: string;
  protocolo: { id: string; numeroProtocolo: string } | null;
  status: 'cancelado' | 'problema' | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveComplete: () => void;
}

/** Diferente do jotaCaixa (só muda o status, sem motivo) -- aqui a observação é obrigatória, pra sempre ficar rastreável por que um protocolo foi cancelado/teve problema. */
export default function DialogCancelarOuProblema({ empresaId, protocolo, status, open, onOpenChange, onSaveComplete }: DialogCancelarOuProblemaProps) {
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function confirmar() {
    if (!protocolo || !status) return;
    if (observacao.trim().length < 3) {
      showError('Informe uma observação (mínimo 3 caracteres).');
      return;
    }
    setSalvando(true);
    try {
      await cancelarOuMarcarProblema(empresaId, protocolo.id, status, observacao);
      showSuccess(status === 'cancelado' ? 'Protocolo cancelado.' : 'Protocolo marcado com problema.');
      setObservacao('');
      onOpenChange(false);
      onSaveComplete();
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível atualizar o protocolo');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{status === 'cancelado' ? 'Cancelar protocolo' : 'Marcar protocolo com problema'}</DialogTitle>
          {protocolo && <DialogDescription>Protocolo {protocolo.numeroProtocolo}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Observação *</Label>
            <Textarea rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Explique o motivo" />
          </div>
          <Button className="w-full" variant={status === 'cancelado' ? 'destructive' : 'default'} onClick={confirmar} disabled={salvando}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
