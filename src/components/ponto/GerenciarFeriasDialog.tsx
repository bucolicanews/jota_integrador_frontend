import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cancelarFerias, criarFerias, listarFerias } from '../../servicos/pontoEletronico';
import { showError, showSuccess } from '../../utils/toast';

const ROTULO_STATUS: Record<string, { label: string; variant: any }> = {
  agendada: { label: 'Agendada', variant: 'default' },
  concluida: { label: 'Concluída', variant: 'secondary' },
  cancelada: { label: 'Cancelada', variant: 'destructive' },
};

interface GerenciarFeriasDialogProps {
  funcionarioId: string;
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  onSalvo: () => void;
}

export default function GerenciarFeriasDialog({ funcionarioId, open, onOpenChange, onSalvo }: GerenciarFeriasDialogProps) {
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [periodoReferencia, setPeriodoReferencia] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    listarFerias(funcionarioId)
      .then(setPeriodos)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(() => {
    if (open) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function agendar() {
    if (!dataInicio || !dataFim) {
      setErro('Informe início e fim.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await criarFerias({ usuarioAlvoId: funcionarioId, dataInicio, dataFim, periodoReferencia: periodoReferencia || undefined });
      showSuccess('Férias agendadas.');
      setDataInicio('');
      setDataFim('');
      setPeriodoReferencia('');
      carregar();
      onSalvo();
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível agendar as férias');
    } finally {
      setEnviando(false);
    }
  }

  async function cancelar(id: string) {
    try {
      await cancelarFerias(id);
      showSuccess('Férias canceladas.');
      carregar();
      onSalvo();
    } catch (e: any) {
      showError(e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Férias</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Período de referência (opcional)</Label>
            <Input placeholder="Ex: 2025/2026" value={periodoReferencia} onChange={(e) => setPeriodoReferencia(e.target.value)} />
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <Button onClick={agendar} disabled={enviando} className="w-full">
            {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Agendar férias
          </Button>
        </div>

        <div className="mt-2 space-y-2 border-t pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Períodos</p>
          {carregando ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : periodos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma férias registrada.</p>
          ) : (
            periodos.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span>
                  {new Date(`${p.dataInicio}T00:00:00`).toLocaleDateString('pt-BR')} - {new Date(`${p.dataFim}T00:00:00`).toLocaleDateString('pt-BR')}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={ROTULO_STATUS[p.status]?.variant}>{ROTULO_STATUS[p.status]?.label}</Badge>
                  {p.status === 'agendada' && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => cancelar(p.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
