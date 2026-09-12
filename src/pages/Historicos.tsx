import { useEffect, useState } from 'react';
import { Loader2, PlusCircle, ListChecks, Edit, Trash2 } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import FormHistorico from '../components/historicos/FormHistorico';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarHistoricos, excluirHistorico } from '../servicos/historicos';
import { showError, showSuccess } from '../utils/toast';

export default function Historicos() {
  const { empresaId } = useEmpresaAtiva();
  const [historicos, setHistoricos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [historicoParaEditar, setHistoricoParaEditar] = useState<any | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  function carregar() {
    if (!empresaId) return;
    setCarregando(true);
    listarHistoricos(empresaId)
      .then(setHistoricos)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId]);

  async function aoExcluir(id: string) {
    setExcluindo(id);
    try {
      await excluirHistorico(empresaId!, id);
      showSuccess('Histórico excluído.');
      carregar();
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível excluir o histórico');
    } finally {
      setExcluindo(null);
    }
  }

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <ListChecks className="mr-2 h-6 w-6" /> Históricos
        </h1>
        <Button
          onClick={() => {
            setHistoricoParaEditar(null);
            setDialogAberto(true);
          }}
          className="w-full sm:w-auto"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Novo histórico
        </Button>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Descrições sugeridas pro campo "histórico" dos lançamentos -- só uma sugestão de preenchimento rápido, não trava o lançamento a esse cadastro.
      </p>

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
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        Nenhum histórico cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    historicos.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-mono text-xs">{h.codigo || '—'}</TableCell>
                        <TableCell className="text-sm">{h.descricao}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setHistoricoParaEditar(h);
                                setDialogAberto(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" disabled={excluindo === h.id}>
                                  {excluindo === h.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir este histórico?</AlertDialogTitle>
                                  <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => aoExcluir(h.id)}>Confirmar exclusão</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
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
            <DialogTitle>{historicoParaEditar ? 'Editar histórico' : 'Novo histórico'}</DialogTitle>
          </DialogHeader>
          <FormHistorico
            empresaId={empresaId}
            historicoInicial={historicoParaEditar}
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
