import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import EditorTemplateTags from './EditorTemplateTags';
import { criarModeloContrato, atualizarModeloContrato, obterCatalogoTags } from '../../servicos/contratos';
import { showSuccess } from '../../utils/toast';

interface FormModeloContratoProps {
  empresaId: string;
  modeloInicial?: any | null;
  onSaveComplete: () => void;
}

export default function FormModeloContrato({ empresaId, modeloInicial, onSaveComplete }: FormModeloContratoProps) {
  const isEditing = !!modeloInicial;
  const [titulo, setTitulo] = useState(modeloInicial?.titulo ?? '');
  const [conteudoTemplate, setConteudoTemplate] = useState(modeloInicial?.conteudoTemplate ?? '');
  const [tipoConteudo, setTipoConteudo] = useState<'html' | 'texto'>(modeloInicial?.tipoConteudo ?? 'texto');
  const [tags, setTags] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    obterCatalogoTags(empresaId)
      .then((catalogo: any[]) => setTags(catalogo.map((t) => t.nome)))
      .catch(() => setTags([]));
  }, [empresaId]);

  async function salvar() {
    if (!titulo.trim() || !conteudoTemplate.trim()) {
      setErro('Título e conteúdo são obrigatórios');
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      const dados = { titulo, conteudoTemplate, tipoConteudo };
      if (isEditing) {
        await atualizarModeloContrato(empresaId, modeloInicial.id, dados);
      } else {
        await criarModeloContrato(empresaId, dados);
      }
      showSuccess(`Modelo ${isEditing ? 'atualizado' : 'criado'} com sucesso.`);
      onSaveComplete();
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível salvar o modelo');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Título do modelo *</Label>
        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Contrato de Honorários Contábeis" />
      </div>

      <EditorTemplateTags conteudo={conteudoTemplate} onConteudoChange={setConteudoTemplate} tipoConteudo={tipoConteudo} onTipoConteudoChange={setTipoConteudo} tags={tags} />

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <Button className="w-full" disabled={salvando} onClick={salvar}>
        {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEditing ? 'Salvar alterações' : 'Criar modelo'}
      </Button>
    </div>
  );
}
