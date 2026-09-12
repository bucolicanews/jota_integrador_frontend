import { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface EditorTemplateTagsProps {
  conteudo: string;
  onConteudoChange: (valor: string) => void;
  tipoConteudo: 'html' | 'texto';
  onTipoConteudoChange: (valor: 'html' | 'texto') => void;
  tags: string[];
}

/**
 * Sem editor rich-text (Quill) -- textarea simples + toggle HTML/texto + painel de tags
 * clicáveis que inserem {{TAG}} na posição do cursor. Mesmo conceito do jotaCaixa, sem a
 * dependência de rich-text (simplificação deliberada, documentada no plano da Fase 6).
 */
export default function EditorTemplateTags({ conteudo, onConteudoChange, tipoConteudo, onTipoConteudoChange, tags }: EditorTemplateTagsProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function inserirTag(tag: string) {
    const textarea = textareaRef.current;
    const marcador = `{{${tag}}}`;
    if (!textarea) {
      onConteudoChange(conteudo + marcador);
      return;
    }
    const inicio = textarea.selectionStart ?? conteudo.length;
    const fim = textarea.selectionEnd ?? conteudo.length;
    const novoConteudo = conteudo.slice(0, inicio) + marcador + conteudo.slice(fim);
    onConteudoChange(novoConteudo);
    requestAnimationFrame(() => {
      textarea.focus();
      const posicao = inicio + marcador.length;
      textarea.setSelectionRange(posicao, posicao);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Conteúdo do modelo</Label>
        <ToggleGroup type="single" size="sm" value={tipoConteudo} onValueChange={(v) => v && onTipoConteudoChange(v as 'html' | 'texto')}>
          <ToggleGroupItem value="texto">Texto simples</ToggleGroupItem>
          <ToggleGroupItem value="html">HTML</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <Textarea
        ref={textareaRef}
        value={conteudo}
        onChange={(e) => onConteudoChange(e.target.value)}
        rows={12}
        className="font-mono text-sm"
        placeholder={tipoConteudo === 'html' ? '<p>Contrato entre {{EMPRESA_RAZAO_SOCIAL}} e {{CLIENTE_NOME}}...</p>' : 'Contrato entre {{EMPRESA_RAZAO_SOCIAL}} e {{CLIENTE_NOME}}...'}
      />
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Clique numa tag pra inserir no cursor</Label>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Button key={tag} type="button" variant="outline" size="sm" className="h-7 font-mono text-xs" onClick={() => inserirTag(tag)}>
              {`{{${tag}}}`}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
