import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import EditorTemplateTags from '../contratos/EditorTemplateTags';
import { criarModeloSocietario, atualizarModeloSocietario } from '../../servicos/documentosSocietarios';
import { showSuccess } from '../../utils/toast';

// Documento societário não tem catálogo de tags próprio no backend (diferente de
// contratos/, que busca em GET /tags por ter tags customizadas por empresa) -- mesmo
// conjunto de tags de pessoa/empresa que CriarDocumentoSocietarioUseCase já aceita em
// valoresTags (renderizarTags não valida contra lista fixa, só substitui o que achar).
// Omite VALOR_TOTAL/QUANTIDADE_PARCELAS (específicas de contrato financeiro).
const TAGS_SOCIETARIO = [
  'CLIENTE_NOME',
  'CLIENTE_RAZAO_SOCIAL',
  'CLIENTE_DOCUMENTO',
  'CLIENTE_EMAIL',
  'CLIENTE_TELEFONE',
  'CLIENTE_ENDERECO',
  'EMPRESA_RAZAO_SOCIAL',
  'EMPRESA_NOME_FANTASIA',
  'EMPRESA_CNPJ',
  'DATA_HOJE',
];

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

      <EditorTemplateTags conteudo={conteudoTemplate} onConteudoChange={setConteudoTemplate} tipoConteudo={tipoConteudo} onTipoConteudoChange={setTipoConteudo} tags={TAGS_SOCIETARIO} />

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <Button className="w-full" disabled={salvando} onClick={salvar}>
        {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEditing ? 'Salvar alterações' : 'Criar modelo'}
      </Button>
    </div>
  );
}
