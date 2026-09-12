import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, Edit, Layers, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarBlocosSocietarios, criarBlocoSocietario, atualizarBlocoSocietario, excluirBlocoSocietario } from '../servicos/documentosSocietarios';
import { showError, showSuccess } from '../utils/toast';

function FormBloco({ empresaId, blocoInicial, onSaveComplete }: any) {
  const isEditing = !!blocoInicial;
  const [titulo, setTitulo] = useState(blocoInicial?.titulo ?? '');
  const [tipoBloco, setTipoBloco] = useState(blocoInicial?.tipoBloco ?? '');
  const [conteudo, setConteudo] = useState(blocoInicial?.conteudo ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!titulo.trim() || !conteudo.trim()) {
      setErro('Título e conteúdo são obrigatórios');
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      const dados = { titulo, conteudo, tipoBloco: tipoBloco || undefined };
      if (isEditing) {
        await atualizarBlocoSocietario(empresaId, blocoInicial.id, dados);
      } else {
        await criarBlocoSocietario(empresaId, dados);
      }
      showSuccess(`Bloco ${isEditing ? 'atualizado' : 'criado'} com sucesso.`);
      onSaveComplete();
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível salvar o bloco');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Título *</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Cláusula de Foro" />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo (opcional)</Label>
          <Input value={tipoBloco} onChange={(e) => setTipoBloco(e.target.value)} placeholder="Ex: clausula, preambulo" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Conteúdo *</Label>
        <Textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={6} />
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <Button className="w-full" disabled={salvando} onClick={salvar}>
        {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEditing ? 'Salvar alterações' : 'Criar bloco'}
      </Button>
    </div>
  );
}

export default function DocumentosSocietariosBlocos() {
  const { empresaId } = useEmpresaAtiva();
  const [blocos, setBlocos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [blocoParaEditar, setBlocoParaEditar] = useState<any | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  function carregar() {
    if (!empresaId) return;
    setCarregando(true);
    listarBlocosSocietarios(empresaId)
      .then(setBlocos)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId]);

  async function excluir(bloco: any) {
    if (!confirm(`Excluir o bloco "${bloco.titulo}"?`)) return;
    setExcluindo(bloco.id);
    try {
      await excluirBlocoSocietario(empresaId!, bloco.id);
      showSuccess('Bloco excluído.');
      carregar();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setExcluindo(null);
    }
  }

  function copiar(bloco: any) {
    navigator.clipboard.writeText(bloco.conteudo);
    showSuccess('Conteúdo copiado.');
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
            <Layers className="mr-2 h-6 w-6" /> Blocos Societários
          </h1>
        </div>
        <Button
          onClick={() => {
            setBlocoParaEditar(null);
            setDialogAberto(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Novo bloco
        </Button>
      </div>

      {carregando ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : blocos.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Nenhum bloco cadastrado.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {blocos.map((b) => (
            <Card key={b.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{b.titulo}</p>
                    {b.tipoBloco && <p className="text-xs text-muted-foreground">{b.tipoBloco}</p>}
                  </div>
                  <div className="flex flex-shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setBlocoParaEditar(b);
                        setDialogAberto(true);
                      }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => excluir(b)} disabled={excluindo === b.id}>
                      {excluindo === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <p className="line-clamp-4 text-sm text-muted-foreground">{b.conteudo}</p>
                <Button size="sm" variant="outline" className="w-full" onClick={() => copiar(b)}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar conteúdo
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-md md:max-w-[70%]">
          <DialogHeader>
            <DialogTitle>{blocoParaEditar ? 'Editar bloco' : 'Novo bloco societário'}</DialogTitle>
          </DialogHeader>
          <FormBloco
            empresaId={empresaId}
            blocoInicial={blocoParaEditar}
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
