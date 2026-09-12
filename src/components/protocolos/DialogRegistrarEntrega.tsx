import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { registrarEntregaProtocolo } from '../../servicos/protocolos';
import { showError, showSuccess } from '../../utils/toast';

const hoje = () => new Date().toISOString().slice(0, 10);

interface DialogRegistrarEntregaProps {
  empresaId: string;
  protocolo: { id: string; numeroProtocolo: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveComplete: () => void;
}

export default function DialogRegistrarEntrega({ empresaId, protocolo, open, onOpenChange, onSaveComplete }: DialogRegistrarEntregaProps) {
  const [nomeRespRecebimento, setNomeRespRecebimento] = useState('');
  const [dataRecebimento, setDataRecebimento] = useState(hoje());
  const [foto, setFoto] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function confirmar() {
    if (!protocolo) return;
    if (nomeRespRecebimento.trim().length < 3) {
      showError('Informe o nome do responsável pelo recebimento (mínimo 3 caracteres).');
      return;
    }
    if (!foto) {
      showError('A foto do protocolo assinado é obrigatória.');
      return;
    }
    setSalvando(true);
    try {
      await registrarEntregaProtocolo(empresaId, protocolo.id, { nomeRespRecebimento, dataRecebimento, foto });
      showSuccess('Entrega registrada com sucesso.');
      setNomeRespRecebimento('');
      setFoto(null);
      onOpenChange(false);
      onSaveComplete();
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível registrar a entrega');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar entrega</DialogTitle>
          {protocolo && <DialogDescription>Protocolo {protocolo.numeroProtocolo}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome do responsável pelo recebimento *</Label>
            <Input value={nomeRespRecebimento} onChange={(e) => setNomeRespRecebimento(e.target.value)} placeholder="Digite o nome" />
          </div>
          <div className="space-y-1.5">
            <Label>Data de entrega *</Label>
            <Input type="date" value={dataRecebimento} onChange={(e) => setDataRecebimento(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Foto do protocolo assinado *</Label>
            <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
          </div>
          <Button className="w-full" onClick={confirmar} disabled={salvando}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar entrega
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
