import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { atualizarContaContabil } from '../../servicos/planoContas';
import { showError, showSuccess } from '../../utils/toast';

interface EditableCellPropsTexto {
  empresaId: string;
  contaId: string;
  valor: string;
  campo: 'nome';
  tipo?: 'texto';
  onSalvo: () => void;
}

interface EditableCellPropsBooleano {
  empresaId: string;
  contaId: string;
  valor: boolean;
  campo: 'contaCaixaBanco' | 'contaAReceber' | 'contaAPagar';
  tipo: 'booleano';
  onSalvo: () => void;
}

type EditableCellProps = EditableCellPropsTexto | EditableCellPropsBooleano;

/** Célula clicável-pra-editar do Plano de Contas -- PATCH direto ao sair do campo (texto) ou ao marcar (checkbox). */
export default function EditableCell(props: EditableCellProps) {
  const { empresaId, contaId, campo, onSalvo } = props;
  const ehBooleano = props.tipo === 'booleano';
  const [editando, setEditando] = useState(false);
  const [valorTexto, setValorTexto] = useState(ehBooleano ? '' : (props.valor as string));
  const [salvando, setSalvando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) inputRef.current?.focus();
  }, [editando]);

  async function salvar(dados: Record<string, unknown>) {
    setSalvando(true);
    try {
      await atualizarContaContabil(empresaId, contaId, dados);
      showSuccess('Conta atualizada.');
      onSalvo();
    } catch (erro: any) {
      showError(erro.message ?? 'Falha ao salvar');
    } finally {
      setSalvando(false);
      setEditando(false);
    }
  }

  if (ehBooleano) {
    return (
      <div className="flex justify-center">
        {salvando ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Checkbox checked={props.valor} onCheckedChange={(marcado) => salvar({ [campo]: Boolean(marcado) })} />
        )}
      </div>
    );
  }

  if (!editando) {
    return (
      <button
        type="button"
        className="w-full rounded px-1 py-0.5 text-left hover:bg-muted/60"
        onClick={() => setEditando(true)}
      >
        {props.valor}
      </button>
    );
  }

  return (
    <Input
      ref={inputRef}
      className="h-8"
      value={valorTexto}
      disabled={salvando}
      onChange={(e) => setValorTexto(e.target.value)}
      onBlur={() => {
        const novo = valorTexto.trim();
        if (!novo || novo === props.valor) {
          setEditando(false);
          setValorTexto(props.valor as string);
          return;
        }
        salvar({ [campo]: novo });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setValorTexto(props.valor as string);
          setEditando(false);
        }
        if (e.key === 'Enter') inputRef.current?.blur();
      }}
    />
  );
}
