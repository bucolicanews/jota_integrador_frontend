import { useEffect, useState } from 'react';
import { Loader2, PlusCircle, Banknote, Edit, Power, PowerOff } from 'lucide-react';
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

export default function Bancos() {
  const { empresaId } = useEmpresaAtiva();
  const [contasPlano, setContasPlano] = useState<any[]>([]);
  const [bancos, setBancos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [apenasAtivos, setApenasAtivos] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [bancoParaEditar, setBancoParaEditar] = useState<any | null>(null);
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
      .then(setBancos)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId, apenasAtivos]);

  async function alternarAtivo(banco: any) {
    setProcessando(banco.id);
    try {
      if (banco.ativo) {
        await desativarBanco(empresaId!, banco.id);
        showSuccess('Banco desativado.');
      } else {
        await reativarBanco(empresaId!, banco.id);
        showSuccess('Banco reativado.');
      }
      carregar();
    } catch (erro: any) {
      showError(erro.message);
    } finally {
      setProcessando(null);
    }
  }

  const totalSaldo = bancos.reduce((soma, b) => soma + (b.saldoAtual ?? 0), 0);

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <Banknote className="mr-2 h-6 w-6" /> Bancos
        </h1>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="outline" onClick={() => setApenasAtivos((v) => !v)} className="w-full sm:w-auto">
            {apenasAtivos ? 'Mostrando ativos' : 'Mostrando todos'}
          </Button>
          <Button
            onClick={() => {
              setBancoParaEditar(null);
              setDialogAberto(true);
            }}
            className="w-full sm:w-auto"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Novo banco
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-primary/40 bg-primary/5 sm:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Saldo consolidado</p>
            <p className={cn('mt-1 text-xl font-bold', totalSaldo < 0 && 'text-destructive')}>{formatarMoeda(totalSaldo)}</p>
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
                    <TableHead>Conta contábil</TableHead>
                    <TableHead className="w-[130px] text-right">Saldo atual</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bancos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Nenhum banco cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    bancos.map((b) => {
                      const conta = contasPlano.find((c) => c.id === b.contaContabilId);
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.nome}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{conta ? `${conta.codigo} — ${conta.nome}` : '—'}</TableCell>
                          <TableCell className={cn('text-right font-mono text-sm font-semibold', b.saldoAtual < 0 && 'text-destructive')}>{formatarMoeda(b.saldoAtual)}</TableCell>
                          <TableCell>
                            <Badge variant={b.ativo ? 'success' : 'secondary'}>{b.ativo ? 'Ativo' : 'Inativo'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setBancoParaEditar(b);
                                  setDialogAberto(true);
                                }}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => alternarAtivo(b)} disabled={processando === b.id}>
                                {processando === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : b.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
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
            <DialogTitle>{bancoParaEditar ? 'Editar banco' : 'Novo banco'}</DialogTitle>
          </DialogHeader>
          <FormBanco
            empresaId={empresaId}
            contas={contasPlano}
            bancoInicial={bancoParaEditar}
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
