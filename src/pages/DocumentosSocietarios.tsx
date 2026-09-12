import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, Building2, FileText, Layers, Loader2, PlusCircle } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarDocumentosSocietarios, listarModelosSocietarios } from '../servicos/documentosSocietarios';
import { showError } from '../utils/toast';

const STATUS_BADGE: Record<string, { label: string; variant: any }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  finalizado: { label: 'Finalizado', variant: 'success' },
  arquivado: { label: 'Arquivado', variant: 'outline' },
};

function TabelaDocumentos({ documentos, aoAbrir }: { documentos: any[]; aoAbrir: (id: string) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Título</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[140px]">Criado em</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documentos.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
              Nenhum documento aqui.
            </TableCell>
          </TableRow>
        ) : (
          documentos.map((d) => {
            const badge = STATUS_BADGE[d.status] ?? { label: d.status, variant: 'secondary' };
            return (
              <TableRow key={d.id} className="cursor-pointer" onClick={() => aoAbrir(d.id)}>
                <TableCell className="font-medium">{d.titulo}</TableCell>
                <TableCell>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(d.criadoEm).toLocaleDateString('pt-BR')}</TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

export default function DocumentosSocietarios() {
  const { empresaId } = useEmpresaAtiva();
  const navigate = useNavigate();
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [modelos, setModelos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [dialogModelosAberto, setDialogModelosAberto] = useState(false);

  function carregar() {
    if (!empresaId) return;
    setCarregando(true);
    listarDocumentosSocietarios(empresaId)
      .then(setDocumentos)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId]);

  function abrirEscolhaModelo() {
    listarModelosSocietarios(empresaId!)
      .then(setModelos)
      .catch((e) => showError(e.message));
    setDialogModelosAberto(true);
  }

  if (!empresaId) return null;

  const rascunhos = documentos.filter((d) => d.status === 'rascunho');
  const finalizados = documentos.filter((d) => d.status === 'finalizado');
  const arquivados = documentos.filter((d) => d.status === 'arquivado');

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <Building2 className="mr-2 h-6 w-6" /> Documentos Societários
        </h1>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link to="/documentos-societarios/blocos">
              <Layers className="mr-2 h-4 w-4" /> Blocos
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link to="/documentos-societarios/modelos">
              <FileText className="mr-2 h-4 w-4" /> Modelos
            </Link>
          </Button>
          <Button onClick={abrirEscolhaModelo} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Novo documento
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          {carregando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="rascunhos">
              <TabsList className="mb-4">
                <TabsTrigger value="rascunhos">Rascunhos ({rascunhos.length})</TabsTrigger>
                <TabsTrigger value="finalizados">Finalizados ({finalizados.length})</TabsTrigger>
                <TabsTrigger value="arquivados">
                  <Archive className="mr-1.5 h-3.5 w-3.5" /> Arquivados ({arquivados.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="rascunhos">
                <TabelaDocumentos documentos={rascunhos} aoAbrir={(id) => navigate(`/documentos-societarios/${id}`)} />
              </TabsContent>
              <TabsContent value="finalizados">
                <TabelaDocumentos documentos={finalizados} aoAbrir={(id) => navigate(`/documentos-societarios/${id}`)} />
              </TabsContent>
              <TabsContent value="arquivados">
                <TabelaDocumentos documentos={arquivados} aoAbrir={(id) => navigate(`/documentos-societarios/${id}`)} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogModelosAberto} onOpenChange={setDialogModelosAberto}>
        <DialogContent className="max-w-md md:max-w-[70%]">
          <DialogHeader>
            <DialogTitle>Escolha um modelo</DialogTitle>
          </DialogHeader>
          {modelos.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum modelo cadastrado.{' '}
              <Link to="/documentos-societarios/modelos" className="text-primary hover:underline">
                Criar o primeiro
              </Link>
              .
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {modelos.map((m) => (
                <Card key={m.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(`/documentos-societarios/gerar/${m.id}`)}>
                  <CardContent className="flex items-center gap-2 p-3">
                    <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{m.titulo}</p>
                      <p className="text-xs text-muted-foreground">{m.tipoDocumento}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </LayoutPrincipal>
  );
}
