import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
const formatarData = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR') : '—');

interface Transacao {
  id: string;
  dataCompetencia: string;
  descricao: string;
  valor: number;
  tipo: 'Entrada' | 'Saida';
  contaContabilId: string;
  contaContabilResultadoId: string | null;
  lancamentoId: string | null;
}

interface ContaContabil {
  id: string;
  codigo: string;
  nome: string;
}

interface TabelaTransacoesConciliadasProps {
  transacoes: Transacao[];
  contas: ContaContabil[];
  contasResultado: ContaContabil[];
  carregando: boolean;
}

/** Aba "Conciliadas" de Mapeamento -- só leitura, mostra o que já foi processado e pra qual conta/lançamento foi. Sem desvincular: desfazer uma conciliação exigiria estornar o lançamento contábil gerado, fluxo ainda não construído (mesmo cuidado de Contas a Pagar/Receber, que já tem estorno próprio por pagamento). */
export default function TabelaTransacoesConciliadas({ transacoes, contas, contasResultado, carregando }: TabelaTransacoesConciliadasProps) {
  const nomeConta = (id: string) => contas.find((c) => c.id === id)?.nome ?? '—';
  const nomeContaResultado = (id: string | null) => (id ? contasResultado.find((c) => c.id === id)?.nome ?? '—' : '—');

  if (carregando) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-h-[520px] overflow-x-auto overflow-y-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[90px]">Data</TableHead>
            <TableHead className="min-w-[160px]">Descrição</TableHead>
            <TableHead className="w-[90px]">Tipo</TableHead>
            <TableHead className="w-[110px] text-right">Valor</TableHead>
            <TableHead className="min-w-[140px]">Conta bancária</TableHead>
            <TableHead className="min-w-[160px]">Contrapartida</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transacoes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                Nenhuma transação conciliada ainda.
              </TableCell>
            </TableRow>
          ) : (
            transacoes.map((t) => (
              <TableRow key={t.id}>
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
                <TableCell className="text-sm">{nomeConta(t.contaContabilId)}</TableCell>
                <TableCell className="text-sm">{nomeContaResultado(t.contaContabilResultadoId)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
