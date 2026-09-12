import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArrowLeft, CheckCircle2, Loader2, Save, Trash2 } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import {
  obterDocumentoSocietario,
  atualizarDocumentoSocietario,
  excluirDocumentoSocietario,
  finalizarDocumentoSocietario,
  arquivarDocumentoSocietario,
} from '../servicos/documentosSocietarios';
import { showError, showSuccess } from '../utils/toast';

const STATUS_BADGE: Record<string, { label: string; variant: any }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  finalizado: { label: 'Finalizado', variant: 'success' },
  arquivado: { label: 'Arquivado', variant: 'outline' },
};

export default function DocumentoSocietarioDetalhe() {
  const { empresaId } = useEmpresaAtiva();
  const { id } = useParams();
  const navigate = useNavigate();
  const [documento, setDocumento] = useState<any | null>(null);
  const [conteudo, setConteudo] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [processando, setProcessando] = useState(false);

  function carregar() {
    if (!empresaId || !id) return;
    setCarregando(true);
    obterDocumentoSocietario(empresaId, id)
      .then((d: any) => {
        setDocumento(d);
        setConteudo(d.conteudoPrincipalManual ?? d.conteudoRenderizado);
      })
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId, id]);

  async function salvarConteudo() {
    setSalvando(true);
    try {
      await atualizarDocumentoSocietario(empresaId!, id!, { conteudoPrincipalManual: conteudo });
      showSuccess('Conteúdo salvo.');
      carregar();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function finalizar() {
    setProcessando(true);
    try {
      await finalizarDocumentoSocietario(empresaId!, id!);
      showSuccess('Documento finalizado.');
      carregar();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setProcessando(false);
    }
  }

  async function arquivar() {
    setProcessando(true);
    try {
      await arquivarDocumentoSocietario(empresaId!, id!);
      showSuccess('Documento arquivado.');
      carregar();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setProcessando(false);
    }
  }

  async function excluir() {
    if (!confirm('Excluir este documento? Esta ação não pode ser desfeita.')) return;
    setProcessando(true);
    try {
      await excluirDocumentoSocietario(empresaId!, id!);
      showSuccess('Documento excluído.');
      navigate('/documentos-societarios');
    } catch (e: any) {
      showError(e.message);
    } finally {
      setProcessando(false);
    }
  }

  if (!empresaId) return null;
  if (carregando || !documento) {
    return (
      <LayoutPrincipal>
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </LayoutPrincipal>
    );
  }

  const badge = STATUS_BADGE[documento.status] ?? { label: documento.status, variant: 'secondary' };
  const podeEditar = documento.status === 'rascunho';

  return (
    <LayoutPrincipal>
      <Link to="/documentos-societarios" className="mb-1 flex items-center text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar
      </Link>
      <div className="mb-6 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{documento.titulo}</h1>
          <Badge variant={badge.variant} className="mt-1">{badge.label}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {documento.status === 'rascunho' && (
            <Button variant="outline" onClick={finalizar} disabled={processando}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar
            </Button>
          )}
          {documento.status === 'finalizado' && (
            <Button variant="outline" onClick={arquivar} disabled={processando}>
              <Archive className="mr-2 h-4 w-4" /> Arquivar
            </Button>
          )}
          {podeEditar && (
            <Button variant="destructive" onClick={excluir} disabled={processando}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <Label>Conteúdo (editável livremente)</Label>
          <Textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={16} readOnly={!podeEditar} className="font-mono text-sm" />
          {podeEditar && (
            <Button onClick={salvarConteudo} disabled={salvando}>
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
          )}
        </CardContent>
      </Card>
    </LayoutPrincipal>
  );
}
