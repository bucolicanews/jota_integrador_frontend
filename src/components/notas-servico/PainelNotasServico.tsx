import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircle2, Clock, Loader2, Radio, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { listarNotasServicoPendentes, obterPainelNotasServico } from '../../servicos/notasServico';
import { showError } from '../../utils/toast';

// Mesma semântica de cor de PainelNotasFiscais.tsx -- prestador (saída, a empresa prestou o
// serviço) é receita, tomador (entrada, a empresa tomou de terceiro) é despesa.
const COR_ENTRADA = '#FF8042';
const COR_SAIDA = '#00C49F';
const DIAS_TENDENCIA = 14;
const DATA_INICIO_SEM_LIMITE = '2000-01-01';

const formatarMoeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

function TooltipGrafico({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-card p-2 text-sm shadow-lg">
      <p className="mb-1 font-bold">{label}</p>
      {payload.map((item: any) => (
        <p key={item.dataKey} style={{ color: item.color }}>
          {item.name}: {item.value}
        </p>
      ))}
    </div>
  );
}

function isoParaChave(iso: string): string {
  return iso.slice(0, 10);
}

interface PainelNotasServicoProps {
  empresaId: string;
  onSelecionarFiltro?: (status: 'capturada' | 'aprovada' | 'rejeitada' | 'todas') => void;
  chaveRecarga?: number;
}

/** Dashboard de acompanhamento pra NFS-e -- mesmo layout de PainelNotasFiscais.tsx, sem o card de status do agente (NFS-e usa o mesmo agente local de notas-fiscais, status já aparece lá). */
export default function PainelNotasServico({ empresaId, onSelecionarFiltro, chaveRecarga }: PainelNotasServicoProps) {
  const [carregando, setCarregando] = useState(true);
  const [itens, setItens] = useState<any[]>([]);
  const [totalPendentes, setTotalPendentes] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    const dataFim = new Date().toISOString().slice(0, 10);

    Promise.all([
      obterPainelNotasServico(empresaId, DATA_INICIO_SEM_LIMITE, dataFim),
      listarNotasServicoPendentes(empresaId),
    ])
      .then(([listaItens, pendentes]) => {
        if (cancelado) return;
        setItens(listaItens);
        setTotalPendentes(pendentes.length);
      })
      .catch((erro) => showError(erro.message))
      .finally(() => !cancelado && setCarregando(false));

    return () => {
      cancelado = true;
    };
  }, [empresaId, chaveRecarga]);

  if (carregando) {
    return (
      <div className="mb-6 flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const aprovadas = itens.filter((i) => i.status === 'aprovada');
  const rejeitadas = itens.filter((i) => i.status === 'rejeitada');
  const valorAprovado = aprovadas.reduce((soma, i) => soma + i.valorLiquido, 0);

  const hoje = new Date();
  const diasOrdenados: string[] = Array.from({ length: DIAS_TENDENCIA }, (_, i) => {
    const d = new Date(hoje.getTime() - (DIAS_TENDENCIA - 1 - i) * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const contagemPorDia = new Map<string, { entrada: number; saida: number }>();
  for (const dia of diasOrdenados) contagemPorDia.set(dia, { entrada: 0, saida: 0 });
  for (const item of itens) {
    const dia = isoParaChave(item.dataEmissaoDps);
    const bucket = contagemPorDia.get(dia);
    if (!bucket) continue;
    bucket[item.direcao as 'entrada' | 'saida']++;
  }
  const dadosTendencia = diasOrdenados.map((dia) => ({
    name: new Date(`${dia}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    Entrada: contagemPorDia.get(dia)!.entrada,
    Saída: contagemPorDia.get(dia)!.saida,
  }));

  return (
    <div className="mb-6 space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          role="button"
          tabIndex={0}
          onClick={() => onSelecionarFiltro?.('capturada')}
          className={cn('border-l-4 border-amber-500', onSelecionarFiltro && 'cursor-pointer transition-shadow hover:shadow-md')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center text-sm font-medium">
              <Clock className="mr-2 h-4 w-4" /> Pendentes de revisão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totalPendentes}</div>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => onSelecionarFiltro?.('aprovada')}
          className={cn('border-l-4 border-green-500', onSelecionarFiltro && 'cursor-pointer transition-shadow hover:shadow-md')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center text-sm font-medium">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{aprovadas.length}</div>
            <p className="text-xs text-muted-foreground">{formatarMoeda(valorAprovado)}</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => onSelecionarFiltro?.('rejeitada')}
          className={cn('border-l-4 border-red-500', onSelecionarFiltro && 'cursor-pointer transition-shadow hover:shadow-md')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center text-sm font-medium">
              <XCircle className="mr-2 h-4 w-4" /> Rejeitadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejeitadas.length}</div>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => onSelecionarFiltro?.('todas')}
          className={cn('border-l-4 border-blue-500', onSelecionarFiltro && 'cursor-pointer transition-shadow hover:shadow-md')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center text-sm font-medium">
              <Radio className="mr-2 h-4 w-4" /> Capturadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{itens.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">NFS-e capturadas por dia (últimos {DIAS_TENDENCIA} dias)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosTendencia} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis dataKey="name" stroke="hsl(var(--foreground))" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} stroke="hsl(var(--foreground))" />
              <Tooltip content={<TooltipGrafico />} />
              <Legend />
              <Bar dataKey="Entrada" stackId="notas" fill={COR_ENTRADA} />
              <Bar dataKey="Saída" stackId="notas" fill={COR_SAIDA} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
