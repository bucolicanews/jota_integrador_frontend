import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { obterModeloSocietario, criarDocumentoSocietario } from '../servicos/documentosSocietarios';
import { listarClientes } from '../servicos/clientes';
import { renderizarTags, extrairTagsDoTemplate } from '../utils/renderizarTags';
import { showError, showSuccess } from '../utils/toast';

export default function DocumentoSocietarioGerar() {
  const { empresaId } = useEmpresaAtiva();
  const { modeloId } = useParams();
  const navigate = useNavigate();

  const [modelo, setModelo] = useState<any | null>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [titulo, setTitulo] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [dataRegistro, setDataRegistro] = useState('');
  const [valoresTags, setValoresTags] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaId || !modeloId) return;
    Promise.all([obterModeloSocietario(empresaId, modeloId), listarClientes(empresaId, true)])
      .then(([m, cs]) => {
        setModelo(m);
        setTitulo(m.titulo);
        setClientes(cs);
      })
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }, [empresaId, modeloId]);

  const tags = useMemo(() => (modelo ? extrairTagsDoTemplate(modelo.conteudoTemplate) : []), [modelo]);
  const preview = useMemo(() => (modelo ? renderizarTags(modelo.conteudoTemplate, valoresTags) : ''), [modelo, valoresTags]);

  async function gerar() {
    if (!titulo.trim()) {
      setErro('Título é obrigatório');
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      const resultado: any = await criarDocumentoSocietario(empresaId!, {
        modeloId,
        clienteId: clienteId || undefined,
        titulo,
        valoresTags,
        dataRegistro: dataRegistro || undefined,
      });
      showSuccess('Documento gerado com sucesso.');
      navigate(`/documentos-societarios/${resultado.id}`);
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível gerar o documento');
    } finally {
      setSalvando(false);
    }
  }

  if (!empresaId) return null;
  if (carregando) {
    return (
      <LayoutPrincipal>
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </LayoutPrincipal>
    );
  }

  return (
    <LayoutPrincipal>
      <Link to="/documentos-societarios" className="mb-1 flex items-center text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar
      </Link>
      <h1 className="mb-6 text-2xl font-bold md:text-3xl">Gerar: {modelo?.titulo}</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="space-y-1.5">
              <Label>Título do documento *</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Cliente (opcional)</Label>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Nenhum</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razaoSocial || c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Data de registro (opcional)</Label>
              <Input type="date" value={dataRegistro} onChange={(e) => setDataRegistro(e.target.value)} />
            </div>

            {tags.length > 0 && (
              <div className="space-y-2 rounded-md border p-3">
                <Label className="text-xs text-muted-foreground">Tags do modelo</Label>
                {tags.map((tag) => (
                  <div key={tag} className="space-y-1">
                    <Label className="font-mono text-xs">{`{{${tag}}}`}</Label>
                    <Input value={valoresTags[tag] ?? ''} onChange={(e) => setValoresTags((v) => ({ ...v, [tag]: e.target.value }))} />
                  </div>
                ))}
              </div>
            )}

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <Button className="w-full" disabled={salvando} onClick={gerar}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gerar documento
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Label className="mb-2 block">Preview</Label>
            <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm">{preview}</div>
          </CardContent>
        </Card>
      </div>
    </LayoutPrincipal>
  );
}
