import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type ModoFiltroPeriodo = 'mes' | 'ano' | 'personalizado';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatarIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Último dia do mês (mês 1-12) -- new Date(ano, mes, 0) já é o truque padrão (dia 0 do mês seguinte = último dia do mês atual). */
function fimDoMes(ano: number, mes: number): string {
  return formatarIso(new Date(ano, mes, 0));
}

function inicioDoMes(ano: number, mes: number): string {
  return formatarIso(new Date(ano, mes - 1, 1));
}

interface FiltroPeriodoProps {
  onChange: (periodo: { dataInicio: string; dataFim: string }) => void;
  /**
   * Relatório de posição (ex: Balanço Patrimonial) só usa 1 data -- "mês"/"ano" viram atalho
   * pra escolher o ÚLTIMO dia daquele mês/ano, e "personalizado" vira 1 campo de data só (em
   * vez de "De"/"Até"). dataInicio ainda é calculada e repassada no onChange (mesmo valor que
   * um relatório de período usaria), mas a página que só precisa de dataFim simplesmente a ignora.
   */
  apenasDataFim?: boolean;
}

/** Filtro de período compartilhado entre Balanço/DRE/Balancete -- mesmo bloco pros 3, em vez de cada página reinventar o próprio seletor de mês/ano (ver padrão "1 config compartilhada" já usado em outras telas do projeto). */
export default function FiltroPeriodo({ onChange, apenasDataFim = false }: FiltroPeriodoProps) {
  const hoje = new Date();
  const [modo, setModo] = useState<ModoFiltroPeriodo>('mes');
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState(inicioDoMes(hoje.getFullYear(), hoje.getMonth() + 1));
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState(fimDoMes(hoje.getFullYear(), hoje.getMonth() + 1));

  const anosDisponiveis = useMemo(() => Array.from({ length: 7 }, (_, i) => hoje.getFullYear() - i), [hoje]);

  const periodo = useMemo(() => {
    if (modo === 'mes') return { dataInicio: inicioDoMes(ano, mes), dataFim: fimDoMes(ano, mes) };
    if (modo === 'ano') return { dataInicio: formatarIso(new Date(ano, 0, 1)), dataFim: formatarIso(new Date(ano, 11, 31)) };
    return { dataInicio: dataInicioPersonalizada, dataFim: dataFimPersonalizada };
  }, [modo, ano, mes, dataInicioPersonalizada, dataFimPersonalizada]);

  useEffect(() => {
    onChange(periodo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo.dataInicio, periodo.dataFim]);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <div className="flex gap-1 rounded-md border bg-secondary/40 p-1">
        {(['mes', 'ano', 'personalizado'] as ModoFiltroPeriodo[]).map((opcao) => (
          <Button
            key={opcao}
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setModo(opcao)}
            className={cn('h-8 px-3', modo === opcao && 'bg-background shadow-sm')}
          >
            {opcao === 'mes' ? 'Mês' : opcao === 'ano' ? 'Ano' : 'Período'}
          </Button>
        ))}
      </div>

      {modo === 'mes' && (
        <div className="flex gap-2">
          <div>
            <Label className="mb-1 block text-xs">Mês</Label>
            <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MESES.map((nome, indice) => (
                  <SelectItem key={nome} value={String(indice + 1)}>{nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs">Ano</Label>
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="h-9 w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {anosDisponiveis.map((a) => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {modo === 'ano' && (
        <div>
          <Label className="mb-1 block text-xs">Ano</Label>
          <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger className="h-9 w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {anosDisponiveis.map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {modo === 'personalizado' && (
        <div className="flex items-end gap-3">
          {!apenasDataFim && (
            <div>
              <Label className="mb-1 block text-xs">De</Label>
              <input
                type="date"
                value={dataInicioPersonalizada}
                onChange={(e) => setDataInicioPersonalizada(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              />
            </div>
          )}
          <div>
            <Label className="mb-1 block text-xs">{apenasDataFim ? 'Data' : 'Até'}</Label>
            <input
              type="date"
              value={dataFimPersonalizada}
              onChange={(e) => setDataFimPersonalizada(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
        </div>
      )}

      {apenasDataFim && modo !== 'personalizado' && (
        <p className="text-xs text-muted-foreground">
          Balanço em {new Date(`${periodo.dataFim}T00:00:00`).toLocaleDateString('pt-BR')}
        </p>
      )}
    </div>
  );
}
