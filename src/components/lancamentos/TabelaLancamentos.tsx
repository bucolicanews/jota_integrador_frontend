import { Fragment, useEffect, useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { estornarLancamento, listarLancamentos } from '../../servicos/lancamentos';
import { listarPlanoContas } from '../../servicos/planoContas';
import { showError, showSuccess } from '../../utils/toast';

const ROTULO_ORIGEM: Record<string, string> = {
  manual: 'Manual',
  contas_a_pagar: 'Contas a pagar',
  contas_a_receber: 'Contas a receber',
  contrato: 'Contrato',
  conciliacao_bancaria: 'Conciliação bancária',
  estorno: 'Estorno',
};

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
const formatarData = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR') : '—');

interface TabelaLancamentosProps {
  empresaId: string;
  somenteOrigem?: string;
  refreshKey: number;
}

export default function TabelaLancamentos({ empresaId, somenteOrigem, refreshKey }: TabelaLancamentosProps) {
  const [lancamentos, setLancamentos] = useState<any[] | null>(null);
  const [contas, setContas] = useState<any[]>([]);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [motivoEstorno, setMotivoEstorno] = useState<Record<string, string>>({});
  const [estornando, setEstornando] = useState<string | null>(null);

  const mapaContas = useMemo(() => Object.fromEntries(contas.map((c) => [c.id, c])), [contas]);

  async function carregar() {
    try {
      const [dadosLancamentos, dadosContas] = await Promise.all([listarLancamentos(empresaId), listarPlanoContas(empresaId)]);
      setLancamentos(somenteOrigem ? dadosLancamentos.filter((l: any) => l.origem === somenteOrigem) : dadosLancamentos);
      setContas(dadosContas);
    } catch (erro: any) {
      showError(erro.message);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, refreshKey]);

  function alternarExpansao(id: string) {
    const novo = new Set(expandidos);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    setExpandidos(novo);
  }

  async function aoEstornar(id: string) {
    const motivo = motivoEstorno[id]?.trim();
    if (!motivo || motivo.length < 3) {
      showError('Informe um motivo (mín. 3 caracteres) para estornar.');
      return;
    }
    setEstornando(id);
    try {
      await estornarLancamento(empresaId, id, motivo);
      showSuccess('Lançamento estornado.');
      carregar();
    } catch (erro: any) {
      showError(erro.message);
    } finally {
      setEstornando(null);
    }
  }

  if (lancamentos === null) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (lancamentos.length === 0) {
    return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum lançamento encontrado.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Histórico</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lancamentos.map((lancamento) => (
            <Fragment key={lancamento.id}>
              <TableRow className="cursor-pointer" onClick={() => alternarExpansao(lancamento.id)}>
                <TableCell className="text-muted-foreground">{expandidos.has(lancamento.id) ? '▾' : '▸'}</TableCell>
                <TableCell>{formatarData(lancamento.dataCompetencia)}</TableCell>
                <TableCell>{lancamento.historico}</TableCell>
                <TableCell className="text-muted-foreground">{ROTULO_ORIGEM[lancamento.origem] ?? lancamento.origem}</TableCell>
                <TableCell>
                  {lancamento.estornado ? (
                    <Badge variant="secondary">Estornado</Badge>
                  ) : lancamento.origem === 'estorno' ? (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Estorno</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {!lancamento.estornado && lancamento.origem !== 'estorno' && (
                    <div className="flex items-center gap-1.5">
                      <input
                        placeholder="Motivo do estorno"
                        className="h-8 w-40 rounded-md border border-input bg-background px-2 text-xs"
                        value={motivoEstorno[lancamento.id] ?? ''}
                        onChange={(e) => setMotivoEstorno((prev) => ({ ...prev, [lancamento.id]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-destructive"
                        disabled={estornando === lancamento.id}
                        onClick={() => aoEstornar(lancamento.id)}
                      >
                        {estornando === lancamento.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Estornar'}
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
              {expandidos.has(lancamento.id) && (
                <TableRow>
                  <TableCell colSpan={6} className="bg-muted/30 p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-8">Conta</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lancamento.partidas.map((partida: any) => (
                          <TableRow key={partida.id}>
                            <TableCell className="pl-8">
                              {mapaContas[partida.contaId] ? `${mapaContas[partida.contaId].codigo} — ${mapaContas[partida.contaId].nome}` : partida.contaId}
                            </TableCell>
                            <TableCell className="capitalize">{partida.tipo}</TableCell>
                            <TableCell className="text-right font-medium">{formatarMoeda(partida.valor)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
