import { useEffect, useState } from 'react';
import { Loader2, Landmark, PlusCircle, Edit, Power, PowerOff } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import FormBanco from '../components/bancos/FormBanco';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarPlanoContas } from '../servicos/planoContas';
import { listarBancos, desativarBanco, reativarBanco } from '../servicos/bancos';
import { showError, showSuccess } from '../utils/toast';

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);

const RÓTULO_TIPO: Record<string, string> = { banco: 'Banco', caixa: 'Caixa', outra: 'Outra' };

// Consolida Bancos + Caixa + Outras contas numa visão única de saldo. Bancos/Caixa
// continuam cadastrados nas telas próprias (/bancos, /caixa) -- aqui só mostra, não edita.
// "Outra" (aplicação/cartão/investimento) não tem tela própria -- cadastro/edição dela
// vive só aqui, de propósito (decisão confirmada com o usuário).
export default function ContasSaldos() {
  const { empresaId } = useEmpresaAtiva();
  const [contasPlano, setContasPlano] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [apenasAtivos, setApenasAtivos] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [contaParaEditar, setContaParaEditar] = useState<any | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaId) return;
    listarPlanoContas(empresaId)
      .then(setContasPlano)
      .catch((erro) => showError(erro.message));
  }, [empresaId]);

  function carregar() {
    if (!empresaId) return;
    setCarregando(true);
    listarBancos(empresaId, apenasAtivos)
      .then(setContas)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId, apenasAtivos]);

  async function alternarAtivo(c: any) {
    setProcessando(c.id);
    try {
      if (c.ativo) {
        await desativarBanco(empresaId!, c.id);
        showSuccess('Conta desativada.');
      } else {
        await reativarBanco(empresaId!, c.id);
        showSuccess('Conta reativada.');
      }
      carregar();
    } catch (erro: any) {
      showError(erro.message);
    } finally {
      setProcessando(null);
    }
  }

  const totalBancos = contas.filter((c) => c.tipo === 'banco').reduce((soma, c) => soma + (c.saldoAtual ?? 0), 0);
  const totalCaixas = contas.filter((c) => c.tipo === 'caixa').reduce((soma, c) => soma + (c.saldoAtual ?? 0), 0);
  const totalOutras = contas.filter((c) => c.tipo === 'outra').reduce((soma, c) => soma + (c.saldoAtual ?? 0), 0);
  const totalGeral = totalBancos + totalCaixas + totalOutras;

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <Landmark className="mr-2 h-6 w-6" /> Contas e Saldos
        </h1>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="outline" onClick={() => setApenasAtivos((v) => !v)} className="w-full sm:w-auto">
            {apenasAtivos ? 'Mostrando ativos' : 'Mostrando todos'}
          </Button>
          <Button
            onClick={() => {
              setContaParaEditar(null);
              setDialogAberto(true);
            }}
            className="w-full sm:w-auto"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Nova conta
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Saldo consolidado</p>
            <p className={cn('mt-1 text-xl font-bold', totalGeral < 0 && 'text-destructive')}>{formatarMoeda(totalGeral)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Bancos</p>
            <p className={cn('mt-1 text-xl font-bold', totalBancos < 0 && 'text-destructive')}>{formatarMoeda(totalBancos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Caixa</p>
            <p className={cn('mt-1 text-xl font-bold', totalCaixas < 0 && 'text-destructive')}>{formatarMoeda(totalCaixas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Outras</p>
            <p className={cn('mt-1 text-xl font-bold', totalOutras < 0 && 'text-destructive')}>{formatarMoeda(totalOutras)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {carregando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Conta contábil</TableHead>
                    <TableHead className="w-[130px] text-right">Saldo atual</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Nenhuma conta cadastrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    contas.map((c) => {
                      const conta = contasPlano.find((cp) => cp.id === c.contaContabilId);
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.nome}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{RÓTULO_TIPO[c.tipo] ?? c.tipo}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{conta ? `${conta.codigo} — ${conta.nome}` : '—'}</TableCell>
                          <TableCell className={cn('text-right font-mono text-sm font-semibold', c.saldoAtual < 0 && 'text-destructive')}>{formatarMoeda(c.saldoAtual)}</TableCell>
                          <TableCell>
                            <Badge variant={c.ativo ? 'success' : 'secondary'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {c.tipo === 'outra' ? (
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    setContaParaEditar(c);
                                    setDialogAberto(true);
                                  }}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => alternarAtivo(c)} disabled={processando === c.id}>
                                  {processando === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : c.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Ver em {c.tipo === 'banco' ? 'Bancos' : 'Caixa'}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{contaParaEditar ? 'Editar conta' : 'Nova conta'}</DialogTitle>
          </DialogHeader>
          <FormBanco
            empresaId={empresaId}
            contas={contasPlano}
            tipo="outra"
            bancoInicial={contaParaEditar}
            onSaveComplete={() => {
              setDialogAberto(false);
              carregar();
            }}
          />
        </DialogContent>
      </Dialog>
    </LayoutPrincipal>
  );
}
