import { useEffect, useState } from 'react';
import { Loader2, PlusCircle, Truck, Edit, Power, PowerOff } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import FormFornecedor from '../components/fornecedores/FormFornecedor';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarFornecedores, desativarFornecedor, reativarFornecedor } from '../servicos/fornecedores';
import { showError, showSuccess } from '../utils/toast';

export default function Fornecedores() {
  const { empresaId } = useEmpresaAtiva();
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [apenasAtivos, setApenasAtivos] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [fornecedorParaEditar, setFornecedorParaEditar] = useState<any | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  function carregar() {
    if (!empresaId) return;
    setCarregando(true);
    listarFornecedores(empresaId, apenasAtivos)
      .then(setFornecedores)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId, apenasAtivos]);

  async function alternarAtivo(fornecedor: any) {
    setProcessando(fornecedor.id);
    try {
      if (fornecedor.ativo) {
        await desativarFornecedor(empresaId!, fornecedor.id);
        showSuccess('Fornecedor desativado.');
      } else {
        await reativarFornecedor(empresaId!, fornecedor.id);
        showSuccess('Fornecedor reativado.');
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
          <Truck className="mr-2 h-6 w-6" /> Fornecedores
        </h1>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="outline" onClick={() => setApenasAtivos((v) => !v)} className="w-full sm:w-auto">
            {apenasAtivos ? 'Mostrando ativos' : 'Mostrando todos'}
          </Button>
          <Button
            onClick={() => {
              setFornecedorParaEditar(null);
              setDialogAberto(true);
            }}
            className="w-full sm:w-auto"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Novo fornecedor
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
                  {fornecedores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Nenhum fornecedor encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    fornecedores.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.razaoSocial || f.nome}</TableCell>
                        <TableCell className="text-sm">{f.documento || '—'}</TableCell>
                        <TableCell className="text-sm">{f.telefone || '—'}</TableCell>
                        <TableCell className="text-sm">{f.cidade || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={f.ativo ? 'success' : 'secondary'}>{f.ativo ? 'Ativo' : 'Inativo'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setFornecedorParaEditar(f);
                                setDialogAberto(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => alternarAtivo(f)} disabled={processando === f.id}>
                              {processando === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : f.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
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
            <DialogTitle>{fornecedorParaEditar ? 'Editar fornecedor' : 'Novo fornecedor'}</DialogTitle>
          </DialogHeader>
          <FormFornecedor
            empresaId={empresaId}
            fornecedorInicial={fornecedorParaEditar}
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
