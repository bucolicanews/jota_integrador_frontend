import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { obterConfiguracaoFuncionario, atualizarConfiguracaoFuncionario } from '../../servicos/pontoEletronico';
import { showError, showSuccess } from '../../utils/toast';

const DIAS_SEMANA: { valor: string; rotulo: string }[] = [
  { valor: 'domingo', rotulo: 'Dom' },
  { valor: 'segunda', rotulo: 'Seg' },
  { valor: 'terca', rotulo: 'Ter' },
  { valor: 'quarta', rotulo: 'Qua' },
  { valor: 'quinta', rotulo: 'Qui' },
  { valor: 'sexta', rotulo: 'Sex' },
  { valor: 'sabado', rotulo: 'Sáb' },
];

interface ConfigurarFuncionarioDialogProps {
  funcionarioId: string;
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  onSalvo: () => void;
}

export default function ConfigurarFuncionarioDialog({ funcionarioId, open, onOpenChange, onSalvo }: ConfigurarFuncionarioDialogProps) {
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salario, setSalario] = useState('');
  const [horasMensais, setHorasMensais] = useState('');
  const [diasFolgaFixos, setDiasFolgaFixos] = useState<string[]>([]);
  const [folgaDomingoObrigatoria, setFolgaDomingoObrigatoria] = useState(false);
  const [dataInicioContrato, setDataInicioContrato] = useState('');

  useEffect(() => {
    if (!open) return;
    setCarregando(true);
    setErro(null);
    obterConfiguracaoFuncionario(funcionarioId)
      .then((config: any) => {
        setSalario(config?.salario != null ? String(config.salario) : '');
        setHorasMensais(config?.horasMensais != null ? String(config.horasMensais) : '');
        setDiasFolgaFixos(config?.diasFolgaFixos ?? []);
        setFolgaDomingoObrigatoria(config?.folgaDomingoObrigatoria ?? false);
        setDataInicioContrato(config?.dataInicioContrato ?? '');
      })
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }, [open, funcionarioId]);

  function alternarDiaFolga(dia: string) {
    setDiasFolgaFixos((atual) => (atual.includes(dia) ? atual.filter((d) => d !== dia) : [...atual, dia]));
  }

  async function salvar() {
    setEnviando(true);
    setErro(null);
    try {
      await atualizarConfiguracaoFuncionario(funcionarioId, {
        salario: salario ? Number(salario) : null,
        horasMensais: horasMensais ? Number(horasMensais) : undefined,
        diasFolgaFixos,
        folgaDomingoObrigatoria,
        dataInicioContrato: dataInicioContrato || null,
      });
      showSuccess('Configuração do funcionário salva.');
      onSalvo();
      onOpenChange(false);
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível salvar a configuração');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configuração do funcionário</DialogTitle>
        </DialogHeader>

        {carregando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Alimenta o cálculo da folha de ponto (jornada esperada) e, mais adiante, o Fator R da apuração do Simples Nacional.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Salário (R$)</Label>
                <Input type="number" step="0.01" min="0" value={salario} onChange={(e) => setSalario(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Carga horária mensal (h)</Label>
                <Input type="number" step="1" min="0" value={horasMensais} onChange={(e) => setHorasMensais(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Data de início do contrato</Label>
              <Input type="date" value={dataInicioContrato} onChange={(e) => setDataInicioContrato(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Dias de folga fixos</Label>
              <div className="flex flex-wrap gap-3">
                {DIAS_SEMANA.map((dia) => (
                  <label key={dia.valor} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={diasFolgaFixos.includes(dia.valor)} onCheckedChange={() => alternarDiaFolga(dia.valor)} />
                    {dia.rotulo}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={folgaDomingoObrigatoria} onCheckedChange={(v) => setFolgaDomingoObrigatoria(Boolean(v))} />
              Folga de domingo obrigatória
            </label>

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <Button onClick={salvar} disabled={enviando} className="w-full">
              {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar configuração
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
