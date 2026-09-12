import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Check, Link2, XCircle, ArrowUpCircle, ArrowDownCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ModalParcelasCandidatas from './ModalParcelasCandidatas';
import {
  atualizarContaResultado,
  confirmarTransacoes,
  ignorarTransacao,
} from '../../servicos/conciliacaoBancaria';
import { showError, showSuccess } from '../../utils/toast';

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
const formatarData = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR') : '—');

interface Transacao {
  id: string;
  dataCompetencia: string;
  descricao: string;
  identificacao: string | null;
  valor: number;
  tipo: 'Entrada' | 'Saida';
  status: 'pendente' | 'conciliada' | 'duplicada' | 'ignorada';
  contaContabilResultadoId: string | null;
}

interface ContaContabil {
  id: string;
  codigo: string;
  nome: string;
}

interface PainelTransacoesPendentesProps {
  empresaId: string;
  transacoes: Transacao[];
  contasResultado: ContaContabil[];
  onMudou: () => void;
}

/** Tabela compartilhada entre a aba "Nova Conciliação" (após preview) e "Pendências" -- categorização direta em conta contábil (individual ou em lote) OU vínculo com parcela de Contas a Pagar/Receber ("Mapear Agora"), com ignorar por transação. */
export default function PainelTransacoesPendentes({ empresaId, transacoes, contasResultado, onMudou }: PainelTransacoesPendentesProps) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [contaLote, setContaLote] = useState<string>('');
  const [processando, setProcessando] = useState<Set<string>>(new Set());
  const [transacaoParaVincular, setTransacaoParaVincular] = useState<Transacao | null>(null);

  const pendentes = transacoes.filter((t) => t.status === 'pendente');
  const duplicadas = transacoes.filter((t) => t.status === 'duplicada');

  const resumo = useMemo(() => {
    const entradas = pendentes.filter((t) => t.tipo === 'Entrada').reduce((acc, t) => acc + t.valor, 0);
    const saidas = pendentes.filter((t) => t.tipo === 'Saida').reduce((acc, t) => acc + t.valor, 0);
    return { entradas, saidas };
  }, [pendentes]);

  function marcarProcessando(id: string, ativo: boolean) {
    setProcessando((prev) => {
      const novo = new Set(prev);
      if (ativo) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  }

  function alternarSelecao(id: string, marcado: boolean) {
    setSelecionadas((prev) => {
      const novo = new Set(prev);
      if (marcado) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  }

  function selecionarTodas(marcado: boolean) {
    setSelecionadas(marcado ? new Set(pendentes.map((t) => t.id)) : new Set());
  }

  async function aoMudarContaResultado(transacaoId: string, contaContabilResultadoId: string) {
    marcarProcessando(transacaoId, true);
    try {
      await atualizarContaResultado(empresaId, transacaoId, contaContabilResultadoId);
      onMudou();
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível categorizar a transação');
    } finally {
      marcarProcessando(transacaoId, false);
    }
  }

  async function aplicarLote() {
    if (!contaLote || selecionadas.size === 0) {
      showError('Selecione uma conta contábil e ao menos uma transação.');
      return;
    }
    const ids = Array.from(selecionadas);
    ids.forEach((id) => marcarProcessando(id, true));
    try {
      await Promise.all(ids.map((id) => atualizarContaResultado(empresaId, id, contaLote)));
      showSuccess(`${ids.length} transações categorizadas.`);
      setContaLote('');
      onMudou();
    } catch (erro: any) {
      showError(erro.message ?? 'Falha ao aplicar em lote');
    } finally {
      ids.forEach((id) => marcarProcessando(id, false));
    }
  }

  async function aoIgnorar(transacaoId: string) {
    marcarProcessando(transacaoId, true);
    try {
      await ignorarTransacao(empresaId, transacaoId);
      showSuccess('Transação ignorada.');
      setSelecionadas((prev) => {
        const novo = new Set(prev);
        novo.delete(transacaoId);
        return novo;
      });
      onMudou();
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível ignorar a transação');
    } finally {
      marcarProcessando(transacaoId, false);
    }
  }

  async function aoConfirmarSelecionadas() {
    if (selecionadas.size === 0) {
      showError('Selecione ao menos uma transação categorizada.');
      return;
    }
    const ids = Array.from(selecionadas);
    ids.forEach((id) => marcarProcessando(id, true));
    try {
      const resultado = await confirmarTransacoes(empresaId, ids);
      if (resultado.quantidadeConciliadas > 0) {
        showSuccess(`${resultado.quantidadeConciliadas} transações conciliadas.`);
      }
      for (const falha of resultado.falhas ?? []) {
        showError(`${falha.descricao}: ${falha.erro}`);
      }
      setSelecionadas(new Set());
      onMudou();
    } catch (erro: any) {
      showError(erro.message ?? 'Falha ao confirmar transações');
    } finally {
      ids.forEach((id) => marcarProcessando(id, false));
    }
  }

  const todasSelecionadas = pendentes.length > 0 && selecionadas.size === pendentes.length;

  return (
    <>
      {pendentes.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-2">
          <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
            <CardContent className="p-3">
              <div className="mb-1 flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs font-semibold text-green-700 dark:text-green-400">Entradas pendentes</span>
              </div>
              <p className="font-mono text-lg font-bold text-green-700 dark:text-green-400">{formatarMoeda(resumo.entradas)}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
            <CardContent className="p-3">
              <div className="mb-1 flex items-center gap-2">
                <ArrowDownCircle className="h-4 w-4 text-red-600" />
                <span className="text-xs font-semibold text-red-700 dark:text-red-400">Saídas pendentes</span>
              </div>
              <p className="font-mono text-lg font-bold text-red-700 dark:text-red-400">{formatarMoeda(resumo.saidas)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {duplicadas.length > 0 && (
        <div className="mb-4 rounded-md border border-green-400 bg-green-100 p-3 dark:bg-green-900/20">
          <p className="flex items-center text-sm font-semibold text-green-700 dark:text-green-300">
            <CheckCircle2 className="mr-2 h-4 w-4" /> {duplicadas.length} transação(ões) ignorada(s) por já existir(em) num extrato anterior.
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-col items-stretch gap-2 rounded-md bg-secondary p-3 md:flex-row md:items-center">
        <div className="flex-1">
          <Select value={contaLote || undefined} onValueChange={setContaLote} disabled={selecionadas.size === 0}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Aplicar conta contábil em lote" />
            </SelectTrigger>
            <SelectContent>
              {contasResultado.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.codigo} — {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={aplicarLote} disabled={!contaLote || selecionadas.size === 0} className="md:w-auto">
          <Check className="mr-2 h-4 w-4" /> Aplicar ({selecionadas.size})
        </Button>
      </div>

      <div className="max-h-[420px] overflow-x-auto overflow-y-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px] text-center">
                <Checkbox checked={todasSelecionadas} onCheckedChange={(v) => selecionarTodas(!!v)} disabled={pendentes.length === 0} />
              </TableHead>
              <TableHead className="w-[90px]">Data</TableHead>
              <TableHead className="min-w-[160px]">Descrição</TableHead>
              <TableHead className="w-[90px]">Tipo</TableHead>
              <TableHead className="w-[110px] text-right">Valor</TableHead>
              <TableHead className="min-w-[280px]">Categorização</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nenhuma transação pendente.
                </TableCell>
              </TableRow>
            ) : (
              transacoes.map((t) => {
                const ehDuplicada = t.status === 'duplicada';
                const ocupada = processando.has(t.id);
                return (
                  <TableRow key={t.id} className={cn(ehDuplicada && 'opacity-60', t.contaContabilResultadoId && !ehDuplicada && 'bg-green-500/5')}>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={selecionadas.has(t.id)}
                        onCheckedChange={(v) => alternarSelecao(t.id, !!v)}
                        disabled={ehDuplicada || ocupada}
                      />
                    </TableCell>
                    <TableCell className="text-xs">{formatarData(t.dataCompetencia)}</TableCell>
                    <TableCell className="text-sm">{t.descricao}</TableCell>
                    <TableCell>
                      <Badge variant={t.tipo === 'Entrada' ? 'success' : 'destructive'} className="flex w-fit items-center gap-1">
                        {t.tipo === 'Entrada' ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                        {t.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn('text-right font-mono text-sm font-semibold', t.tipo === 'Entrada' ? 'text-green-600' : 'text-red-600')}>
                      {formatarMoeda(t.valor)}
                    </TableCell>
                    <TableCell>
                      {ehDuplicada ? (
                        <span className="flex items-center text-xs font-medium text-green-700 dark:text-green-400">
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Já importada
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                          <Select value={t.contaContabilResultadoId ?? undefined} onValueChange={(id) => aoMudarContaResultado(t.id, id)} disabled={ocupada}>
                            <SelectTrigger className="h-8 flex-1 text-xs">
                              <SelectValue placeholder="Categorizar em conta contábil" />
                            </SelectTrigger>
                            <SelectContent>
                              {contasResultado.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.codigo} — {c.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" className="h-8 shrink-0 text-xs" onClick={() => setTransacaoParaVincular(t)} disabled={ocupada}>
                            <Link2 className="mr-1 h-3 w-3" /> Mapear Agora
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {!ehDuplicada && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => aoIgnorar(t.id)} disabled={ocupada}>
                          {ocupada ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-col items-center justify-between gap-2 border-t pt-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">{pendentes.length} transação(ões) pendente(s).</p>
        <Button onClick={aoConfirmarSelecionadas} disabled={selecionadas.size === 0} className="w-full sm:w-auto">
          <Check className="mr-2 h-4 w-4" /> Confirmar selecionadas ({selecionadas.size})
        </Button>
      </div>

      <ModalParcelasCandidatas
        empresaId={empresaId}
        transacao={transacaoParaVincular}
        open={transacaoParaVincular !== null}
        onOpenChange={(open) => {
          if (!open) setTransacaoParaVincular(null);
        }}
        onVinculado={() => onMudou()}
      />
    </>
  );
}
