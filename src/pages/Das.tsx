import { useEffect, useState } from 'react';
import { Loader2, ReceiptText, RefreshCw } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarDas, obterUrlPdfDas, sincronizarDas } from '../servicos/das';
import { showError } from '../utils/toast';

// null = SERPRO não devolveu valor estruturado nesta sincronização (ver comentário do backend em sincronizar-das-empresa.usecase.ts) -- mostra "—" em vez de fabricar R$ 0,00.
const formatarMoeda = (valor: number | null) =>
  valor === null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
const formatarCompetencia = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }) : '—';
const formatarData = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR') : '—');

const ROTULO_STATUS: Record<string, { texto: string; variante: 'success' | 'warning' | 'destructive' }> = {
  pago: { texto: 'Pago', variante: 'success' },
  pendente: { texto: 'A vencer', variante: 'warning' },
  vencido: { texto: 'Vencido', variante: 'destructive' },
};

export default function Das() {
  const { empresaId } = useEmpresaAtiva();
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);
  // Guarda de regime vem do próprio backend (400 se a empresa não for MEI/Simples
  // Nacional) -- evita uma chamada extra só pra checar `regimeTributario` antes.
  const [naoAplicavel, setNaoAplicavel] = useState(false);

  function carregar() {
    if (!empresaId) return;
    setCarregando(true);
    setNaoAplicavel(false);
    listarDas(empresaId)
      .then(setItens)
      .catch((erro) => {
        if (erro.status === 400) setNaoAplicavel(true);
        else showError(erro.message);
      })
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId]);

  function sincronizar() {
    if (!empresaId) return;
    setSincronizando(true);
    sincronizarDas(empresaId)
      .then(() => carregar())
      .catch((erro) => showError(erro.message))
      .finally(() => setSincronizando(false));
  }

  async function baixar(dasId: string) {
    if (!empresaId) return;
    setBaixandoId(dasId);
    try {
      const { url } = await obterUrlPdfDas(empresaId, dasId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível abrir o PDF do DAS');
    } finally {
      setBaixandoId(null);
    }
  }

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <ReceiptText className="mr-2 h-6 w-6" /> DAS
        </h1>
        <Button onClick={sincronizar} disabled={sincronizando || naoAplicavel} className="w-full sm:w-auto">
          <RefreshCw className={`mr-2 h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`} /> Sincronizar agora
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {naoAplicavel ? (
            <div className="flex h-24 items-center justify-center text-center text-sm text-muted-foreground">
              Este módulo é aplicável apenas a empresas MEI ou Simples Nacional ME/EPP.
            </div>
          ) : carregando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competência</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Nenhum DAS sincronizado ainda. Clique em "Sincronizar agora".
                      </TableCell>
                    </TableRow>
                  ) : (
                    itens.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{formatarCompetencia(item.competencia)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatarMoeda(item.valor)}</TableCell>
                        <TableCell className="text-sm">{formatarData(item.vencimento)}</TableCell>
                        <TableCell>
                          <Badge variant={ROTULO_STATUS[item.statusApresentacao].variante}>
                            {ROTULO_STATUS[item.statusApresentacao].texto}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" disabled={baixandoId === item.id} onClick={() => baixar(item.id)}>
                            {baixandoId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Baixar / 2ª via'}
                          </Button>
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
    </LayoutPrincipal>
  );
}
