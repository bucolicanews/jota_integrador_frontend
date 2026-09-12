import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileSignature, ListTree, Loader2, PlusCircle } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarContratos } from '../servicos/contratos';
import { showError } from '../utils/toast';

const fmt = (v: number | null) => (v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v));

const STATUS_BADGE: Record<string, { label: string; variant: any }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  pendente_assinatura: { label: 'Aguardando assinatura', variant: 'warning' },
  ativo: { label: 'Ativo', variant: 'success' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
  concluido: { label: 'Concluído', variant: 'outline' },
  bloqueado: { label: 'Bloqueado', variant: 'destructive' },
};

function TabelaContratos({ contratos, aoAbrir }: { contratos: any[]; aoAbrir: (id: string) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Título</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead className="w-[140px]">Criado em</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contratos.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
              Nenhum contrato aqui.
            </TableCell>
          </TableRow>
        ) : (
          contratos.map((c) => {
            const badge = STATUS_BADGE[c.status] ?? { label: c.status, variant: 'secondary' };
            return (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => aoAbrir(c.id)}>
                <TableCell className="font-medium">{c.titulo}</TableCell>
                <TableCell>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </TableCell>
                <TableCell className="text-right">{fmt(c.valorTotal)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(c.criadoEm).toLocaleDateString('pt-BR')}</TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

export default function Contratos() {
  const { empresaId } = useEmpresaAtiva();
  const navigate = useNavigate();
  const [contratos, setContratos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  function carregar() {
    if (!empresaId) return;
    setCarregando(true);
    listarContratos(empresaId)
      .then(setContratos)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId]);

  if (!empresaId) return null;

  const ativos = contratos.filter((c) => c.status === 'ativo');
  const pendentes = contratos.filter((c) => c.status === 'rascunho' || c.status === 'pendente_assinatura');
  const inativos = contratos.filter((c) => ['cancelado', 'concluido', 'bloqueado'].includes(c.status));

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <FileSignature className="mr-2 h-6 w-6" /> Contratos
        </h1>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link to="/contratos/modelos">
              <ListTree className="mr-2 h-4 w-4" /> Modelos
            </Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/contratos/novo">
              <PlusCircle className="mr-2 h-4 w-4" /> Novo contrato
            </Link>
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
            <Tabs defaultValue="ativos">
              <TabsList className="mb-4">
                <TabsTrigger value="ativos">Ativos ({ativos.length})</TabsTrigger>
                <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
                <TabsTrigger value="inativos">Inativos ({inativos.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="ativos">
                <TabelaContratos contratos={ativos} aoAbrir={(id) => navigate(`/contratos/${id}`)} />
              </TabsContent>
              <TabsContent value="pendentes">
                <TabelaContratos contratos={pendentes} aoAbrir={(id) => navigate(`/contratos/${id}`)} />
              </TabsContent>
              <TabsContent value="inativos">
                <TabelaContratos contratos={inativos} aoAbrir={(id) => navigate(`/contratos/${id}`)} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </LayoutPrincipal>
  );
}
