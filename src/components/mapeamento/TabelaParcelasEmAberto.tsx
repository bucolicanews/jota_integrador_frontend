import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
const formatarData = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR') : '—');

export interface ParcelaEmAberto {
  contaId: string;
  parcelaId: string;
  nomeParte: string;
  descricao: string;
  numeroParcela: number;
  totalParcelas: number;
  valorParcela: number;
  dataVencimento: string;
  status: string;
}

interface TabelaParcelasEmAbertoProps {
  parcelas: ParcelaEmAberto[];
  carregando: boolean;
  rotuloParte: string;
  onAbrirConta: (contaId: string) => void;
}

const hoje = () => new Date().toISOString().slice(0, 10);

/** Aba "CP/CR em Aberto" de Mapeamento -- referência cruzada das parcelas ainda sem pagamento/recebimento, pra facilitar o casamento manual com uma transação bancária que a busca automática ("Mapear Agora") não encontrou (ex: pagamento agrupado, valor com juros). Clicar na linha abre o detalhe da conta (mesmo diálogo já usado em Contas a Pagar/Receber) -- não duplica lógica de pagamento aqui. */
export default function TabelaParcelasEmAberto({ parcelas, carregando, rotuloParte, onAbrirConta }: TabelaParcelasEmAbertoProps) {
  if (carregando) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const dataHoje = hoje();

  return (
    <div className="max-h-[520px] overflow-x-auto overflow-y-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[140px]">{rotuloParte}</TableHead>
            <TableHead className="min-w-[160px]">Descrição</TableHead>
            <TableHead className="w-[80px] text-center">Parcela</TableHead>
            <TableHead className="w-[110px] text-right">Valor</TableHead>
            <TableHead className="w-[100px]">Vencimento</TableHead>
            <TableHead className="w-[90px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parcelas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                Nenhuma parcela em aberto.
              </TableCell>
            </TableRow>
          ) : (
            parcelas.map((p) => {
              const atrasada = p.status !== 'paga' && p.dataVencimento < dataHoje;
              return (
                <TableRow key={p.parcelaId} className="cursor-pointer" onClick={() => onAbrirConta(p.contaId)}>
                  <TableCell className="font-medium">{p.nomeParte}</TableCell>
                  <TableCell className="text-sm">{p.descricao}</TableCell>
                  <TableCell className="text-center text-xs">
                    {p.numeroParcela}/{p.totalParcelas}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatarMoeda(p.valorParcela)}</TableCell>
                  <TableCell className={cn('text-xs', atrasada && 'font-semibold text-destructive')}>{formatarData(p.dataVencimento)}</TableCell>
                  <TableCell>
                    <Badge variant={atrasada ? 'destructive' : p.status === 'parcial' ? 'warning' : 'secondary'}>
                      {atrasada ? 'Atrasada' : p.status === 'parcial' ? 'Parcial' : 'Aberta'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
