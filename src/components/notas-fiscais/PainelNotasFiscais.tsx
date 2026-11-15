import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircle2, Clock, Loader2, Radio, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { listarNotasFiscaisPendentes, obterPainelNotasFiscais, obterStatusAgenteNf } from '../../servicos/notasFiscais';
import { showError } from '../../utils/toast';

// Mesma semântica de cor já usada em DashboardFinanceiro.tsx (receber=verde/pagar=laranja)
// -- entrada (compra) é "dinheiro saindo", saída (venda) é "dinheiro entrando".
const COR_ENTRADA = '#FF8042';
const COR_SAIDA = '#00C49F';
const DIAS_TENDENCIA = 14;
// KPIs de aprovadas/rejeitadas/capturadas contam TODO o histórico, não só os últimos 30 dias
// -- o filtro era por data de EMISSÃO da nota, não por quando foi aprovada/rejeitada no
// sistema. Nota antiga (backlog) aprovada hoje desaparecia do card/lista por estar fora da
// janela de emissão, mesmo recém-processada. Só o gráfico de tendência diária é por dia.
const DATA_INICIO_SEM_LIMITE = '2000-01-01';

const formatarMoeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

function formatarRelativo(iso: string | null): string {
  if (!iso) return 'nunca sincronizou';
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutos = Math.floor(diffMs / 60000);
  if (minutos < 1) return 'agora mesmo';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} dia(s)`;
}

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
  return iso.slice(0, 10); // AAAA-MM-DD, mesmo fuso que o backend grava (dataEmissao vem com timezone, mas o dia já é o que importa aqui)
}

interface PainelNotasFiscaisProps {
  empresaId: string;
  /** Clicar num card de KPI filtra a lista abaixo pro status correspondente e rola até ela. */
  onSelecionarFiltro?: (status: 'capturada' | 'aprovada' | 'rejeitada' | 'todas') => void;
  /** Incrementar pelo componente pai (aprovar/rejeitar nota) força recarregar os KPIs -- o painel não sabe por conta própria que o status de uma nota mudou. */
  chaveRecarga?: number;
}

/** Dashboard de acompanhamento -- status do agente (sincronização) + KPIs dos últimos 30 dias + tendência diária de captura. Fica no topo de /notas-fiscais, antes da fila de revisão. */
export default function PainelNotasFiscais({ empresaId, onSelecionarFiltro, chaveRecarga }: PainelNotasFiscaisProps) {
  const [carregando, setCarregando] = useState(true);
  const [agente, setAgente] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [totalPendentes, setTotalPendentes] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    const dataFim = new Date().toISOString().slice(0, 10);

    // Pendentes (capturada) busca à parte, sem filtro de data nenhum -- mesma premissa já
    // usada em NotasFiscais.tsx pra fila de revisão (backlog pode ser mais antigo).
    Promise.all([
      obterPainelNotasFiscais(empresaId, DATA_INICIO_SEM_LIMITE, dataFim),
      obterStatusAgenteNf(empresaId),
      listarNotasFiscaisPendentes(empresaId),
    ])
      .then(([listaItens, statusAgente, pendentes]) => {
        if (cancelado) return;
        setItens(listaItens);
        setAgente(statusAgente);
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
  const valorAprovado = aprovadas.reduce((soma, i) => soma + i.valorTotal, 0);

  // Tendência diária (últimos 14 dias) -- qtd por dia, agrupado por direção (entrada/saída),
  // ordem categórica fixa (entrada sempre antes de saída, nunca alterna por volume).
  const hoje = new Date();
  const diasOrdenados: string[] = Array.from({ length: DIAS_TENDENCIA }, (_, i) => {
    const d = new Date(hoje.getTime() - (DIAS_TENDENCIA - 1 - i) * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const contagemPorDia = new Map<string, { entrada: number; saida: number }>();
  for (const dia of diasOrdenados) contagemPorDia.set(dia, { entrada: 0, saida: 0 });
  for (const item of itens) {
    const dia = isoParaChave(item.dataEmissao);
    const bucket = contagemPorDia.get(dia);
    if (!bucket) continue; // fora da janela de 14 dias (item mais antigo, só entra no cômputo dos 30 dias dos KPIs)
    bucket[item.direcao as 'entrada' | 'saida']++;
  }
  const dadosTendencia = diasOrdenados.map((dia) => ({
    name: new Date(`${dia}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    Entrada: contagemPorDia.get(dia)!.entrada,
    Saída: contagemPorDia.get(dia)!.saida,
  }));

  const agenteNuncaConfigurado = !agente;
  const agenteAtivo = agente?.ativo ?? false;

  return (
    <div className="mb-6 space-y-6">
      <Card className={cn('border-l-4', agenteNuncaConfigurado ? 'border-gray-300' : agenteAtivo ? 'border-green-500' : 'border-red-500')}>
        <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
          <div className="flex items-center gap-2">
            <Radio className={cn('h-5 w-5', agenteNuncaConfigurado ? 'text-gray-400' : agenteAtivo ? 'text-green-600' : 'text-red-600')} />
            <div>
              <p className="text-sm font-medium">
                {agenteNuncaConfigurado ? 'Agente local não configurado' : agenteAtivo ? 'Agente local ativo' : 'Token do agente revogado'}
              </p>
              <p className="text-xs text-muted-foreground">
                {agenteNuncaConfigurado
                  ? 'Gere um token em "Configurar > Agente local" e instale o agente na máquina do contador/empresa.'
                  : `Última nota recebida: ${formatarRelativo(agente.ultimoUsoEm)}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
          <CardTitle className="text-lg">Notas capturadas por dia (últimos {DIAS_TENDENCIA} dias)</CardTitle>
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
