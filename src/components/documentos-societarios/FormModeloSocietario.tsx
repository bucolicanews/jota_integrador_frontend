import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import EditorTemplateTags from '../contratos/EditorTemplateTags';
import { criarModeloSocietario, atualizarModeloSocietario } from '../../servicos/documentosSocietarios';
import { showSuccess } from '../../utils/toast';

interface FormModeloSocietarioProps {
  empresaId: string;
  modeloInicial?: any | null;
  onSaveComplete: () => void;
}

export default function FormModeloSocietario({ empresaId, modeloInicial, onSaveComplete }: FormModeloSocietarioProps) {
  const isEditing = !!modeloInicial;
  const [titulo, setTitulo] = useState(modeloInicial?.titulo ?? '');
  const [tipoDocumento, setTipoDocumento] = useState(modeloInicial?.tipoDocumento ?? '');
  const [conteudoTemplate, setConteudoTemplate] = useState(modeloInicial?.conteudoTemplate ?? '');
  const [tipoConteudo, setTipoConteudo] = useState<'html' | 'texto'>(modeloInicial?.tipoConteudo ?? 'texto');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!titulo.trim() || !tipoDocumento.trim() || !conteudoTemplate.trim()) {
      setErro('Título, tipo de documento e conteúdo são obrigatórios');
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      const dados = { titulo, tipoDocumento, conteudoTemplate, tipoConteudo };
      if (isEditing) {
        await atualizarModeloSocietario(empresaId, modeloInicial.id, dados);
      } else {
        await criarModeloSocietario(empresaId, dados);
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Título do modelo *</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Ata de Reunião de Sócios" />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo de documento *</Label>
          <Input value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} placeholder="Ex: ata, procuração, alteração contratual" />
        </div>
      </div>

      <EditorTemplateTags conteudo={conteudoTemplate} onConteudoChange={setConteudoTemplate} tipoConteudo={tipoConteudo} onTipoConteudoChange={setTipoConteudo} tags={[]} />

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <Button className="w-full" disabled={salvando} onClick={salvar}>
        {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEditing ? 'Salvar alterações' : 'Criar modelo'}
      </Button>
    </div>
  );
}
