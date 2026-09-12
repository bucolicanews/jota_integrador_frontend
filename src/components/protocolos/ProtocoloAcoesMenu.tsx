import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Eye, Pencil, Trash2, MoreVertical, Printer, Truck, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const PODE_EDITAR_OU_EXCLUIR = new Set(['criado', 'impresso']);
const PODE_CANCELAR = new Set(['criado', 'impresso', 'transito']);
const ROTULO_AVANCO: Record<string, string> = { criado: 'Marcar como Impresso', impresso: 'Marcar como Trânsito' };

interface ProtocoloAcoesMenuProps {
  status: 'criado' | 'impresso' | 'transito' | 'entregue' | 'cancelado' | 'problema';
  onVerDetalhes: () => void;
  onEditar: () => void;
  onImprimir: () => void;
  onAvancar: () => void;
  onDarBaixa: () => void;
  onCancelar: () => void;
  onProblema: () => void;
  onExcluir: () => void;
}

/** Menu de ações reaproveitado entre o card do Kanban e a linha da tabela de Lista -- mesmo conjunto de ações, só muda o gatilho visual. */
export default function ProtocoloAcoesMenu({ status, onVerDetalhes, onEditar, onImprimir, onAvancar, onDarBaixa, onCancelar, onProblema, onExcluir }: ProtocoloAcoesMenuProps) {
  const podeEditarOuExcluir = PODE_EDITAR_OU_EXCLUIR.has(status);
  const podeCancelar = PODE_CANCELAR.has(status);
  const rotuloAvanco = ROTULO_AVANCO[status];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onVerDetalhes}>
          <Eye className="mr-2 h-4 w-4" /> Ver detalhes
        </DropdownMenuItem>
        {podeEditarOuExcluir && (
          <DropdownMenuItem onClick={onEditar}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onImprimir}>
          <Printer className="mr-2 h-4 w-4" /> Imprimir protocolo
        </DropdownMenuItem>
        {rotuloAvanco && (
          <DropdownMenuItem onClick={onAvancar}>
            {status === 'criado' ? <Printer className="mr-2 h-4 w-4" /> : <Truck className="mr-2 h-4 w-4" />}
            {rotuloAvanco}
          </DropdownMenuItem>
        )}
        {status === 'transito' && (
          <DropdownMenuItem onClick={onDarBaixa}>
            <CheckCircle className="mr-2 h-4 w-4" /> Registrar entrega
          </DropdownMenuItem>
        )}
        {podeCancelar && (
          <DropdownMenuItem onClick={onProblema}>
            <AlertTriangle className="mr-2 h-4 w-4" /> Marcar com problema
          </DropdownMenuItem>
        )}
        {podeCancelar && (
          <DropdownMenuItem onClick={onCancelar} className="text-destructive">
            <XCircle className="mr-2 h-4 w-4" /> Cancelar
          </DropdownMenuItem>
        )}
        {podeEditarOuExcluir && (
          <DropdownMenuItem onClick={onExcluir} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
