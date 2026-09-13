import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { lancarFolgaTrabalhada } from '../../servicos/pontoEletronico';
import { showError, showSuccess } from '../../utils/toast';

interface GerenciarFolgaTrabalhadaDialogProps {
  funcionarioId: string;
  data?: string; // dia de folga fixa trabalhado (pré-preenchido quando vem de um alerta "precisa gestão")
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  onSalvo: () => void;
}

/** Folga fixa trabalhada vira Extra100 (hora extra 100%) ou Compensação (folga futura paga, gera abono automático na data escolhida). */
export default function GerenciarFolgaTrabalhadaDialog({ funcionarioId, data: dataInicial, open, onOpenChange, onSalvo }: GerenciarFolgaTrabalhadaDialogProps) {
  const [data, setData] = useState(dataInicial ?? new Date().toISOString().slice(0, 10));
  const [decisao, setDecisao] = useState<'extra100' | 'compensacao'>('extra100');
  const [dataCompensacaoFutura, setDataCompensacaoFutura] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setData(dataInicial ?? new Date().toISOString().slice(0, 10));
      setDecisao('extra100');
      setDataCompensacaoFutura('');
      setErro(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dataInicial]);

  async function salvar() {
    if (decisao === 'compensacao' && !dataCompensacaoFutura) {
      setErro('Informe a data futura da folga de compensação.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await lancarFolgaTrabalhada({ usuarioAlvoId: funcionarioId, data, decisao, dataCompensacaoFutura: decisao === 'compensacao' ? dataCompensacaoFutura : undefined });
      showSuccess('Folga trabalhada registrada.');
      onSalvo();
      onOpenChange(false);
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível registrar a folga trabalhada');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Folga fixa trabalhada</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Data trabalhada</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Decisão</Label>
            <Select value={decisao} onValueChange={(v) => setDecisao(v as 'extra100' | 'compensacao')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="extra100">Pagar como hora extra 100%</SelectItem>
                <SelectItem value="compensacao">Compensar com folga futura</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {decisao === 'compensacao' && (
            <div className="space-y-1.5">
              <Label>Data da folga futura *</Label>
              <Input type="date" value={dataCompensacaoFutura} onChange={(e) => setDataCompensacaoFutura(e.target.value)} />
            </div>
          )}
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <Button onClick={salvar} disabled={enviando} className="w-full">
            {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
