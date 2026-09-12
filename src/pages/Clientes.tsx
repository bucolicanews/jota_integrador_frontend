import { useEffect, useState } from 'react';
import { Loader2, PlusCircle, Users, Edit, Power, PowerOff } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import FormCliente from '../components/clientes/FormCliente';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarClientes, desativarCliente, reativarCliente } from '../servicos/clientes';
import { showError, showSuccess } from '../utils/toast';

export default function Clientes() {
  const { empresaId } = useEmpresaAtiva();
  const [clientes, setClientes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [apenasAtivos, setApenasAtivos] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [clienteParaEditar, setClienteParaEditar] = useState<any | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  function carregar() {
    if (!empresaId) return;
    setCarregando(true);
    listarClientes(empresaId, apenasAtivos)
      .then(setClientes)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId, apenasAtivos]);

  async function alternarAtivo(cliente: any) {
    setProcessando(cliente.id);
    try {
      if (cliente.ativo) {
        await desativarCliente(empresaId!, cliente.id);
        showSuccess('Cliente desativado.');
      } else {
        await reativarCliente(empresaId!, cliente.id);
        showSuccess('Cliente reativado.');
      }
      carregar();
    } catch (erro: any) {
      showError(erro.message);
    } finally {
      setProcessando(null);
    }
  }

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <Users className="mr-2 h-6 w-6" /> Clientes
        </h1>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="outline" onClick={() => setApenasAtivos((v) => !v)} className="w-full sm:w-auto">
            {apenasAtivos ? 'Mostrando ativos' : 'Mostrando todos'}
          </Button>
          <Button
            onClick={() => {
              setClienteParaEditar(null);
              setDialogAberto(true);
            }}
            className="w-full sm:w-auto"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Novo cliente
          </Button>
        </div>
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
                    <TableHead>Documento</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Nenhum cliente encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientes.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.razaoSocial || c.nome}</TableCell>
                        <TableCell className="text-sm">{c.documento || '—'}</TableCell>
                        <TableCell className="text-sm">{c.telefone || '—'}</TableCell>
                        <TableCell className="text-sm">{c.cidade || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={c.ativo ? 'success' : 'secondary'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setClienteParaEditar(c);
                                setDialogAberto(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => alternarAtivo(c)} disabled={processando === c.id}>
                              {processando === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : c.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                            </Button>
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
        <DialogContent className="max-w-md md:max-w-[70%]">
          <DialogHeader>
            <DialogTitle>{clienteParaEditar ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
          </DialogHeader>
          <FormCliente
            empresaId={empresaId}
            clienteInicial={clienteParaEditar}
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
