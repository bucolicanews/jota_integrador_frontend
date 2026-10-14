import { useRef } from 'react';
import { Tag } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EditorTemplateTagsProps {
  conteudo: string;
  onConteudoChange: (valor: string) => void;
  tipoConteudo: 'html' | 'texto';
  onTipoConteudoChange: (valor: 'html' | 'texto') => void;
  tags: string[];
}

/**
 * Sem editor rich-text (Quill) -- textarea simples + toggle HTML/texto + dropdown de tags
 * que insere {{TAG}} na posição do cursor. Mesmo conceito do jotaCaixa, sem a dependência
 * de rich-text (simplificação deliberada, documentada no plano da Fase 6). Tags viram
 * dropdown (em vez de uma lista de botões sempre visível) pra não competir em largura com
 * o toggle HTML/texto no mobile -- os dois ficam lado a lado e quebram juntos como unidade.
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Conteúdo do modelo</Label>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 px-2.5" disabled={tags.length === 0}>
                <Tag className="h-3.5 w-3.5" />
                Inserir tag
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Clique numa tag pra inserir no cursor</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tags.map((tag) => (
                <DropdownMenuItem key={tag} onSelect={() => inserirTag(tag)} className="font-mono text-xs">
                  {`{{${tag}}}`}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <ToggleGroup type="single" size="sm" value={tipoConteudo} onValueChange={(v) => v && onTipoConteudoChange(v as 'html' | 'texto')}>
            <ToggleGroupItem value="texto">Texto simples</ToggleGroupItem>
            <ToggleGroupItem value="html">HTML</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      <Textarea
        ref={textareaRef}
        value={conteudo}
        onChange={(e) => onConteudoChange(e.target.value)}
        rows={12}
        className="font-mono text-sm"
        placeholder={tipoConteudo === 'html' ? '<p>Contrato entre {{EMPRESA_RAZAO_SOCIAL}} e {{CLIENTE_NOME}}...</p>' : 'Contrato entre {{EMPRESA_RAZAO_SOCIAL}} e {{CLIENTE_NOME}}...'}
      />
    </div>
  );
}
