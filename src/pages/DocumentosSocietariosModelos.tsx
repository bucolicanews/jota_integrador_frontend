import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Edit, FileText, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import FormModeloSocietario from '../components/documentos-societarios/FormModeloSocietario';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarModelosSocietarios, excluirModeloSocietario } from '../servicos/documentosSocietarios';
import { showError, showSuccess } from '../utils/toast';

export default function DocumentosSocietariosModelos() {
  const { empresaId } = useEmpresaAtiva();
  const [modelos, setModelos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [modeloParaEditar, setModeloParaEditar] = useState<any | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  function carregar() {
    if (!empresaId) return;
    setCarregando(true);
    listarModelosSocietarios(empresaId)
      .then(setModelos)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId]);

  async function excluir(modelo: any) {
    if (!confirm(`Excluir o modelo "${modelo.titulo}"?`)) return;
    setExcluindo(modelo.id);
    try {
      await excluirModeloSocietario(empresaId!, modelo.id);
      showSuccess('Modelo excluído.');
      carregar();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível excluir o modelo');
    } finally {
      setExcluindo(null);
    }
  }

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link to="/documentos-societarios" className="mb-1 flex items-center text-sm text-muted-foreground hover:underline">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar
          </Link>
          <h1 className="flex items-center text-2xl font-bold md:text-3xl">
            <FileText className="mr-2 h-6 w-6" /> Modelos Societários
          </h1>
        </div>
        <Button
          onClick={() => {
            setModeloParaEditar(null);
            setDialogAberto(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Novo modelo
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {carregando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-[110px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      Nenhum modelo cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  modelos.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.titulo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.tipoDocumento}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setModeloParaEditar(m);
                              setDialogAberto(true);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => excluir(m)} disabled={excluindo === m.id}>
                            {excluindo === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-md md:max-w-[85%]">
          <DialogHeader>
            <DialogTitle>{modeloParaEditar ? 'Editar modelo' : 'Novo modelo societário'}</DialogTitle>
          </DialogHeader>
          <FormModeloSocietario
            empresaId={empresaId}
            modeloInicial={modeloParaEditar}
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
