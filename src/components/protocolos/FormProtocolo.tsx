import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { criarProtocolo, atualizarProtocolo } from '../../servicos/protocolos';
import { showSuccess } from '../../utils/toast';

interface Cliente {
  id: string;
  nome: string;
  razaoSocial: string | null;
}

interface ProtocoloInicial {
  id: string;
  clienteId: string;
  titulo: string;
  descricao: string | null;
  linkTarefa: string | null;
}

interface DadosFormulario {
  clienteId: string;
  titulo: string;
  descricao: string;
  linkTarefa: string;
}

interface FormProtocoloProps {
  empresaId: string;
  clientes: Cliente[];
  protocoloInicial?: ProtocoloInicial | null;
  onSaveComplete: () => void;
}

/** Anexos só na criação -- editar um protocolo depois (título/descrição/link/cliente) não permite adicionar mais anexos nesta v1 (simplificação deliberada, evita a complexidade de misturar "anexos já enviados" com "novos anexos" no mesmo formulário). */
export default function FormProtocolo({ empresaId, clientes, protocoloInicial, onSaveComplete }: FormProtocoloProps) {
  const isEditing = !!protocoloInicial;
  const [anexos, setAnexos] = useState<File[]>([]);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DadosFormulario>({
    defaultValues: {
      clienteId: protocoloInicial?.clienteId ?? '',
      titulo: protocoloInicial?.titulo ?? '',
      descricao: protocoloInicial?.descricao ?? '',
      linkTarefa: protocoloInicial?.linkTarefa ?? '',
    },
  });

  async function aoSubmeter(dados: DadosFormulario) {
    setErroGeral(null);
    try {
      if (isEditing) {
        await atualizarProtocolo(empresaId, protocoloInicial.id, {
          clienteId: dados.clienteId,
          titulo: dados.titulo,
          descricao: dados.descricao || null,
          linkTarefa: dados.linkTarefa || null,
        });
      } else {
        await criarProtocolo(empresaId, {
          clienteId: dados.clienteId,
          titulo: dados.titulo,
          descricao: dados.descricao || null,
          linkTarefa: dados.linkTarefa || null,
          anexos,
        });
      }
      showSuccess(`Protocolo ${isEditing ? 'atualizado' : 'criado'} com sucesso.`);
      onSaveComplete();
    } catch (erro: any) {
      setErroGeral(erro.message ?? 'Não foi possível salvar o protocolo');
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Cliente *</Label>
        <select {...register('clienteId', { required: true })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Selecione...</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.razaoSocial || c.nome}
            </option>
          ))}
        </select>
        {errors.clienteId && <p className="text-xs text-destructive">Obrigatório</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Título *</Label>
        <Input placeholder="Ex: Entrega de contrato assinado" {...register('titulo', { required: true, minLength: 1 })} />
        {errors.titulo && <p className="text-xs text-destructive">Obrigatório</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea rows={3} placeholder="Detalhes adicionais (opcional)" {...register('descricao')} />
      </div>

      <div className="space-y-1.5">
        <Label>Link da tarefa</Label>
        <Input placeholder="https://... (opcional)" {...register('linkTarefa')} />
      </div>

      {!isEditing && (
        <div className="space-y-1.5">
          <Label>Anexos (opcional)</Label>
          <Input type="file" multiple onChange={(e) => setAnexos(Array.from(e.target.files ?? []))} />
          {anexos.length > 0 && <p className="text-xs text-muted-foreground">{anexos.length} arquivo(s) selecionado(s)</p>}
        </div>
      )}

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEditing ? 'Salvar alterações' : 'Criar protocolo'}
      </Button>
    </form>
  );
}
