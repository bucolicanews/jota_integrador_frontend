import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { lancarFaltaOuAbono } from '../../servicos/pontoEletronico';
import { showError, showSuccess } from '../../utils/toast';

const JORNADA_DIARIA_PADRAO_HORAS = 8;

interface GerenciarFaltaAbonoDialogProps {
  funcionarioId: string;
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  onSalvo: () => void;
}

/** Falta com atestado pode ser Total (8h abonada) ou Parcial (faltas+abono somam a jornada diária padrão) -- backend valida de novo, aqui só ajuda o usuário a não errar a conta. */
export default function GerenciarFaltaAbonoDialog({ funcionarioId, open, onOpenChange, onSalvo }: GerenciarFaltaAbonoDialogProps) {
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [horasFalta, setHorasFalta] = useState('8');
  const [horasAbono, setHorasAbono] = useState('0');
  const [atestado, setAtestado] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const soma = (Number(horasFalta) || 0) + (Number(horasAbono) || 0);

  async function salvar() {
    if (soma !== JORNADA_DIARIA_PADRAO_HORAS) {
      setErro(`Faltas + abono precisam somar ${JORNADA_DIARIA_PADRAO_HORAS}h (hoje soma ${soma}h).`);
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await lancarFaltaOuAbono({ usuarioAlvoId: funcionarioId, data, horasFalta: Number(horasFalta), horasAbono: Number(horasAbono), atestado });
      showSuccess('Lançamento registrado.');
      onSalvo();
      onOpenChange(false);
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível lançar falta/abono');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lançar Falta / Abono</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Horas de falta</Label>
              <Input type="number" min="0" max="8" step="1" value={horasFalta} onChange={(e) => setHorasFalta(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Horas de abono</Label>
              <Input type="number" min="0" max="8" step="1" value={horasAbono} onChange={(e) => setHorasAbono(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Total: {soma}h de {JORNADA_DIARIA_PADRAO_HORAS}h (Total = 8h abono; Parcial = falta + abono somando 8h).</p>
          <div className="space-y-1.5">
            <Label>Atestado (opcional)</Label>
            <Input type="file" onChange={(e) => setAtestado(e.target.files?.[0] ?? null)} />
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <Button onClick={salvar} disabled={enviando} className="w-full">
            {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lançar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
