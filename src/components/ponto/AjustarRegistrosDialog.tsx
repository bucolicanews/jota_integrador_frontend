import { useEffect, useState } from 'react';
import { Loader2, PlusCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ajustarRegistrosDoDia } from '../../servicos/pontoEletronico';
import { showError, showSuccess } from '../../utils/toast';

interface LinhaBatida {
  tipo: 'entrada' | 'saida';
  horarioLocal: string; // "YYYY-MM-DDTHH:mm", formato de <input type="datetime-local">
}

interface AjustarRegistrosDialogProps {
  funcionarioId: string;
  data: string; // YYYY-MM-DD
  batidasIniciais: LinhaBatida[];
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  onSalvo: () => void;
}

/** Substitui TODAS as batidas (entrada/saida) do dia -- delete+insert, nunca mexe em falta/abono/compensação/extra100 lançados no mesmo dia. */
export default function AjustarRegistrosDialog({ funcionarioId, data, batidasIniciais, open, onOpenChange, onSalvo }: AjustarRegistrosDialogProps) {
  const [linhas, setLinhas] = useState<LinhaBatida[]>(batidasIniciais);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) setLinhas(batidasIniciais);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, data]);

  function adicionar() {
    setLinhas([...linhas, { tipo: linhas.length % 2 === 0 ? 'entrada' : 'saida', horarioLocal: `${data}T08:00` }]);
  }
  function remover(indice: number) {
    setLinhas(linhas.filter((_, i) => i !== indice));
  }
  function atualizar(indice: number, campo: keyof LinhaBatida, valor: string) {
    setLinhas(linhas.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l)));
  }

  async function salvar() {
    setSalvando(true);
    try {
      const batidas = linhas.map((l) => ({ tipo: l.tipo, horario: new Date(l.horarioLocal).toISOString() }));
      await ajustarRegistrosDoDia(funcionarioId, data, batidas);
      showSuccess('Batidas do dia ajustadas.');
      onSalvo();
      onOpenChange(false);
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível ajustar as batidas');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar batidas -- {data}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {linhas.map((linha, indice) => (
            <div key={indice} className="flex items-center gap-2">
              <Select value={linha.tipo} onValueChange={(v) => atualizar(indice, 'tipo', v)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
              <Input type="datetime-local" value={linha.horarioLocal} onChange={(e) => atualizar(indice, 'horarioLocal', e.target.value)} />
              <Button size="sm" variant="ghost" className="h-8 w-8 shrink-0 p-0" onClick={() => remover(indice)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={adicionar}>
            <PlusCircle className="mr-2 h-3.5 w-3.5" /> Adicionar batida
          </Button>
        </div>
        <Button onClick={salvar} disabled={salvando} className="mt-3 w-full">
          {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
