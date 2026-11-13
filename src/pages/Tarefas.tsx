import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { DndContext, PointerSensor, closestCorners, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowUp,
  CheckIcon,
  ClipboardList,
  History,
  Layers,
  Loader2,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Rss,
  Settings,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import {
  adicionarAnexoTarefa,
  adicionarMembroEquipe,
  atualizarColuna,
  atualizarComentarioTarefa,
  atualizarQuadro,
  atualizarTarefa,
  criarColuna,
  criarComentarioTarefa,
  criarQuadro,
  criarTarefa,
  excluirColuna,
  excluirComentarioTarefa,
  excluirQuadro,
  excluirTarefa,
  listarAnexosTarefa,
  listarComentariosTarefa,
  listarEquipeTarefa,
  listarFeedTarefas,
  listarHistoricoTarefa,
  listarQuadros,
  listarTarefas,
  moverTarefa,
  obterUrlAnexoTarefa,
  removerMembroEquipe,
  reordenarColunas,
} from '../servicos/tarefas';
import { listarUsuarios } from '../servicos/usuarios';
import { showError, showSuccess } from '../utils/toast';

const PAPEIS_DONO = ['SUPER_ADMIN', 'CONTADOR_DONO', 'EMPRESARIO_DONO'];
const ROTULO_PRIORIDADE: Record<string, { texto: string; variante: any }> = {
  baixa: { texto: 'Baixa', variante: 'secondary' },
  media: { texto: 'Média', variante: 'warning' },
  alta: { texto: 'Alta', variante: 'destructive' },
};

function iniciaisDe(nome?: string): string {
  if (!nome) return '?';
  return nome.split(' ').filter(Boolean).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join('');
}

function formatarPrazo(prazo: string | null): string | null {
  if (!prazo) return null;
  return new Date(`${prazo}T00:00:00`).toLocaleDateString('pt-BR');
}

/** Comentar sem abrir a tarefa inteira -- só quem está atribuído agora posta; editar/excluir é só do próprio autor (mesma regra do backend). */
function ComentariosPopover({
  empresaId,
  tarefa,
  membros,
  usuarioAtualId,
}: {
  empresaId: string;
  tarefa: any;
  membros: any[];
  usuarioAtualId: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [rascunho, setRascunho] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [rascunhoEdicao, setRascunhoEdicao] = useState('');

  const podeComentar = tarefa.atribuidoA === usuarioAtualId;

  function carregarComentarios() {
    setCarregando(true);
    listarComentariosTarefa(empresaId, tarefa.id)
      .then(setComentarios)
      .catch((e: any) => showError(e.message ?? 'Não foi possível carregar os comentários'))
      .finally(() => setCarregando(false));
  }

  async function enviar() {
    if (!rascunho.trim()) return;
    setEnviando(true);
    try {
      const novo = await criarComentarioTarefa(empresaId, tarefa.id, rascunho.trim());
      setComentarios((atual) => [...atual, novo]);
      setRascunho('');
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível comentar');
    } finally {
      setEnviando(false);
    }
  }

  async function salvarEdicao(comentario: any) {
    if (!rascunhoEdicao.trim()) return;
    try {
      await atualizarComentarioTarefa(empresaId, tarefa.id, comentario.id, rascunhoEdicao.trim());
      setComentarios((atual) => atual.map((c) => (c.id === comentario.id ? { ...c, corpo: rascunhoEdicao.trim() } : c)));
      setEditandoId(null);
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível editar o comentário');
    }
  }

  async function excluir(comentario: any) {
    try {
      await excluirComentarioTarefa(empresaId, tarefa.id, comentario.id);
      setComentarios((atual) => atual.filter((c) => c.id !== comentario.id));
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível excluir o comentário');
    }
  }

  return (
    <Popover
      open={aberto}
      onOpenChange={(novoAberto) => {
        setAberto(novoAberto);
        if (novoAberto) carregarComentarios();
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => e.stopPropagation()}>
          <MessageSquare className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comentários</p>
        {carregando ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
            {comentarios.length === 0 && <li className="text-xs text-muted-foreground">Nenhum comentário ainda.</li>}
            {comentarios.map((comentario) => {
              const autor = membros.find((m) => m.id === comentario.autorId);
              const ehAutor = comentario.autorId === usuarioAtualId;
              return (
                <li key={comentario.id} className="rounded-md border p-2">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{autor?.nome ?? 'Usuário'} -- {new Date(comentario.criadoEm).toLocaleString('pt-BR')}</span>
                    {ehAutor && editandoId !== comentario.id && (
                      <span className="flex gap-1">
                        <button
                          type="button"
                          className="hover:text-primary"
                          onClick={() => {
                            setEditandoId(comentario.id);
                            setRascunhoEdicao(comentario.corpo);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button type="button" className="hover:text-destructive" onClick={() => excluir(comentario)}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>
                  {editandoId === comentario.id ? (
                    <div className="flex gap-1">
                      <Textarea
                        rows={2}
                        className="text-sm"
                        value={rascunhoEdicao}
                        onChange={(e) => setRascunhoEdicao(e.target.value)}
                      />
                      <div className="flex flex-col gap-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => salvarEdicao(comentario)}>
                          <CheckIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditandoId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{comentario.corpo}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {podeComentar ? (
          <div className="mt-2 flex gap-1.5">
            <Textarea
              rows={2}
              placeholder="Escrever um comentário..."
              className="text-sm"
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
            />
            <Button size="sm" disabled={enviando || !rascunho.trim()} onClick={enviar}>
              {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enviar'}
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Só quem está atribuído a esta tarefa pode comentar.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Atribuir pra outro usuário sem abrir a tarefa inteira -- mesmo endpoint do form
 * completo (PATCH atribuidoA). Lista só quem está na EQUIPE da tarefa -- fila de
 * candidatos, ver ComentariosPopover acima -- e só cai pra "todos os membros" se a
 * equipe ainda estiver vazia (tarefa criada antes dessa feature, ou dono que não montou
 * equipe ainda), pra não travar quem nunca configurou nada.
 */
function AtribuirPopover({
  empresaId,
  tarefa,
  membros,
  onAtribuido,
}: {
  empresaId: string;
  tarefa: any;
  membros: any[];
  onAtribuido: (tarefaId: string, novoAtribuidoA: string | null) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [equipe, setEquipe] = useState<any[]>([]);
  const [carregandoEquipe, setCarregandoEquipe] = useState(false);

  const candidatos = equipe.length > 0 ? membros.filter((m) => equipe.some((eq) => eq.usuarioId === m.id)) : membros;

  async function atribuir(novoId: string | null) {
    setSalvando(true);
    try {
      await atualizarTarefa(empresaId, tarefa.id, { atribuidoA: novoId });
      onAtribuido(tarefa.id, novoId);
      setAberto(false);
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível atribuir a tarefa');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Popover
      open={aberto}
      onOpenChange={(novoAberto) => {
        setAberto(novoAberto);
        if (novoAberto) {
          setCarregandoEquipe(true);
          listarEquipeTarefa(empresaId, tarefa.id)
            .then(setEquipe)
            .catch(() => {})
            .finally(() => setCarregandoEquipe(false));
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => e.stopPropagation()}>
          <UserPlus className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Atribuir a</p>
        {carregandoEquipe ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                disabled={salvando}
                className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted disabled:opacity-50"
                onClick={() => atribuir(null)}
              >
                Ninguém
              </button>
            </li>
            {candidatos.map((membro) => (
              <li key={membro.id}>
                <button
                  type="button"
                  disabled={salvando}
                  className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm hover:bg-muted disabled:opacity-50"
                  onClick={() => atribuir(membro.id)}
                >
                  {membro.id === tarefa.atribuidoA && <CheckIcon className="h-3.5 w-3.5" />}
                  {membro.nome}
                </button>
              </li>
            ))}
            {equipe.length === 0 && (
              <li className="px-2 py-1 text-xs text-muted-foreground">Sem equipe definida -- mostrando todos os membros.</li>
            )}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function CartaoTarefa({
  tarefa,
  membro,
  membros,
  empresaId,
  usuarioAtualId,
  onAbrir,
  onAtribuido,
}: {
  tarefa: any;
  membro: any;
  membros: any[];
  empresaId: string;
  usuarioAtualId: string;
  onAbrir: (t: any) => void;
  onAtribuido: (tarefaId: string, novoAtribuidoA: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tarefa.id });
  const estilo = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const prioridade = ROTULO_PRIORIDADE[tarefa.prioridade] ?? ROTULO_PRIORIDADE.media;

  return (
    <div
      ref={setNodeRef}
      style={estilo}
      {...attributes}
      {...listeners}
      onClick={() => onAbrir(tarefa)}
      className="cursor-pointer rounded-md border bg-card p-3 shadow-sm hover:shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{tarefa.titulo}</p>
        <div className="flex shrink-0 gap-0.5">
          <ComentariosPopover empresaId={empresaId} tarefa={tarefa} membros={membros} usuarioAtualId={usuarioAtualId} />
          <AtribuirPopover empresaId={empresaId} tarefa={tarefa} membros={membros} onAtribuido={onAtribuido} />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Badge variant={prioridade.variante}>{prioridade.texto}</Badge>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {tarefa.tempoEstimadoHoras != null && <span>{tarefa.tempoEstimadoHoras}h</span>}
          {tarefa.prazo && <span>{formatarPrazo(tarefa.prazo)}</span>}
        </div>
      </div>
      {membro && (
        <div className="mt-2 flex items-center gap-1.5">
          <Avatar className="h-5 w-5">
            <AvatarImage src={membro.avatarUrl ?? undefined} />
            <AvatarFallback>{iniciaisDe(membro.nome)}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{membro.nome}</span>
        </div>
      )}
    </div>
  );
}

function ColunaKanban({
  coluna,
  tarefas,
  membros,
  empresaId,
  usuarioAtualId,
  onAbrirTarefa,
  onNovaTarefa,
  onAtribuido,
}: {
  coluna: any;
  tarefas: any[];
  membros: any[];
  empresaId: string;
  usuarioAtualId: string;
  onAbrirTarefa: (t: any) => void;
  onNovaTarefa: (colunaId: string) => void;
  onAtribuido: (tarefaId: string, novoAtribuidoA: string | null) => void;
}) {
  const { setNodeRef } = useDroppable({ id: coluna.id });
  const ids = tarefas.map((tarefa) => tarefa.id);

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-md bg-muted/40 p-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold">{coluna.nome}</span>
          {coluna.ehFinal && (
            <Badge variant="success" className="text-[10px]">
              Final
            </Badge>
          )}
        </div>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onNovaTarefa(coluna.id)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div ref={setNodeRef} className="flex min-h-[80px] flex-1 flex-col gap-2">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {tarefas.map((tarefa) => (
            <CartaoTarefa
              key={tarefa.id}
              tarefa={tarefa}
              membro={membros.find((membro) => membro.id === tarefa.atribuidoA)}
              membros={membros}
              empresaId={empresaId}
              usuarioAtualId={usuarioAtualId}
              onAbrir={onAbrirTarefa}
              onAtribuido={onAtribuido}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

interface DadosFormTarefa {
  titulo: string;
  descricao: string;
  atribuidoA: string;
  prioridade: string;
  prazo: string;
  tempoEstimadoHoras: string;
}

function FormTarefa({
  empresaId,
  tarefa,
  colunaId,
  quadros,
  membros,
  onSalvo,
}: {
  empresaId: string;
  tarefa: any | null;
  colunaId: string | null;
  quadros: any[];
  membros: any[];
  onSalvo: () => void;
}) {
  const isEditing = !!tarefa;
  const todasColunas = quadros.flatMap((q) => q.colunas);

  const [historico, setHistorico] = useState<any[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(isEditing);
  const [anexos, setAnexos] = useState<any[]>([]);
  const [carregandoAnexos, setCarregandoAnexos] = useState(isEditing);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [equipe, setEquipe] = useState<any[]>([]);
  const [carregandoEquipe, setCarregandoEquipe] = useState(isEditing);
  const [novoMembroEquipe, setNovoMembroEquipe] = useState('');
  const [salvandoEquipe, setSalvandoEquipe] = useState(false);

  const [quadroDestino, setQuadroDestino] = useState(tarefa?.quadroId ?? '');
  const [colunaDestino, setColunaDestino] = useState(tarefa?.colunaId ?? '');
  const [responsavelMove, setResponsavelMove] = useState(tarefa?.atribuidoA ?? '');
  const [movendo, setMovendo] = useState(false);
  const colunasDoQuadroDestino = quadros.find((q) => q.id === quadroDestino)?.colunas ?? [];

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DadosFormTarefa>({
    defaultValues: {
      titulo: tarefa?.titulo ?? '',
      descricao: tarefa?.descricao ?? '',
      atribuidoA: tarefa?.atribuidoA ?? '',
      prioridade: tarefa?.prioridade ?? 'media',
      prazo: tarefa?.prazo ?? '',
      tempoEstimadoHoras: tarefa?.tempoEstimadoHoras != null ? String(tarefa.tempoEstimadoHoras) : '',
    },
  });

  useEffect(() => {
    if (!isEditing) return;
    listarHistoricoTarefa(empresaId, tarefa.id)
      .then(setHistorico)
      .catch(() => {})
      .finally(() => setCarregandoHistorico(false));
    listarAnexosTarefa(empresaId, tarefa.id)
      .then(setAnexos)
      .catch(() => {})
      .finally(() => setCarregandoAnexos(false));
    listarEquipeTarefa(empresaId, tarefa.id)
      .then(setEquipe)
      .catch(() => {})
      .finally(() => setCarregandoEquipe(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const idsNaEquipe = new Set(equipe.map((m) => m.usuarioId));
  const membrosForaDaEquipe = membros.filter((m) => !idsNaEquipe.has(m.id));

  async function adicionarNaEquipe() {
    if (!novoMembroEquipe) return;
    setSalvandoEquipe(true);
    try {
      const novo = await adicionarMembroEquipe(empresaId, tarefa.id, novoMembroEquipe);
      setEquipe((atual) => [...atual, novo]);
      setNovoMembroEquipe('');
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível adicionar à equipe');
    } finally {
      setSalvandoEquipe(false);
    }
  }

  async function removerDaEquipe(usuarioId: string) {
    try {
      await removerMembroEquipe(empresaId, tarefa.id, usuarioId);
      setEquipe((atual) => atual.filter((m) => m.usuarioId !== usuarioId));
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível remover da equipe');
    }
  }

  useEffect(() => {
    if (!colunasDoQuadroDestino.some((c: any) => c.id === colunaDestino)) {
      setColunaDestino(colunasDoQuadroDestino[0]?.id ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quadroDestino]);

  async function aoSubmeter(dados: DadosFormTarefa) {
    const payload = {
      titulo: dados.titulo,
      descricao: dados.descricao || null,
      atribuidoA: dados.atribuidoA || null,
      prioridade: dados.prioridade,
      prazo: dados.prazo || null,
      tempoEstimadoHoras: dados.tempoEstimadoHoras ? Number(dados.tempoEstimadoHoras) : null,
    };
    try {
      if (isEditing) {
        await atualizarTarefa(empresaId, tarefa.id, payload);
      } else {
        await criarTarefa(empresaId, { ...payload, colunaId });
      }
      showSuccess('Tarefa salva.');
      onSalvo();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível salvar a tarefa');
    }
  }

  async function moverParaOutraColuna() {
    setMovendo(true);
    try {
      await moverTarefa(empresaId, tarefa.id, colunaDestino, 0, responsavelMove || null);
      showSuccess('Tarefa movida.');
      onSalvo();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível mover a tarefa');
    } finally {
      setMovendo(false);
    }
  }

  async function enviarAnexo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    setEnviandoAnexo(true);
    try {
      const novo = await adicionarAnexoTarefa(empresaId, tarefa.id, arquivo);
      setAnexos((atual) => [...atual, novo]);
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível enviar o anexo');
    } finally {
      setEnviandoAnexo(false);
      evento.target.value = '';
    }
  }

  async function abrirAnexo(anexo: any) {
    try {
      const { url } = await obterUrlAnexoTarefa(empresaId, tarefa.id, anexo.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível abrir o anexo');
    }
  }

  async function aoExcluir() {
    setExcluindo(true);
    try {
      await excluirTarefa(empresaId, tarefa.id);
      showSuccess('Tarefa excluída.');
      onSalvo();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível excluir a tarefa');
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="max-h-[75vh] space-y-3 overflow-y-auto pr-1">
      <div className="space-y-1.5">
        <Label>Título *</Label>
        <Input {...register('titulo', { required: true, minLength: 1 })} />
        {errors.titulo && <p className="text-xs text-destructive">Obrigatório</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea rows={3} {...register('descricao')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Atribuído a</Label>
          <Controller
            control={control}
            name="atribuidoA"
            render={({ field }) => (
              <Select value={field.value || '__nenhum__'} onValueChange={(v) => field.onChange(v === '__nenhum__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__nenhum__">Ninguém</SelectItem>
                  {membros.map((membro) => (
                    <SelectItem key={membro.id} value={membro.id}>
                      {membro.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Prioridade</Label>
          <Controller
            control={control}
            name="prioridade"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Prazo</Label>
          <Input type="date" {...register('prazo')} />
        </div>
        <div className="space-y-1.5">
          <Label>Tempo estimado (horas)</Label>
          <Input type="number" step="0.5" min="0" placeholder="Ex: 4" {...register('tempoEstimadoHoras')} />
        </div>
      </div>

      {isEditing && (
        <div className="space-y-1.5 rounded-md border p-2">
          <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Equipe da tarefa
          </Label>
          <p className="text-xs text-muted-foreground">
            Quem está na equipe vê o pipeline e pode ser escolhido no botão "Atribuir" do card. Vazia = qualquer membro pode ser atribuído.
          </p>
          {carregandoEquipe ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <ul className="space-y-1 text-sm">
              {equipe.length === 0 && <li className="text-xs text-muted-foreground">Nenhum membro na equipe ainda.</li>}
              {equipe.map((membroEquipe) => {
                const membro = membros.find((m) => m.id === membroEquipe.usuarioId);
                return (
                  <li key={membroEquipe.usuarioId} className="flex items-center justify-between rounded border px-2 py-1">
                    <span>{membro?.nome ?? 'Usuário'}</span>
                    <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => removerDaEquipe(membroEquipe.usuarioId)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {membrosForaDaEquipe.length > 0 && (
            <div className="flex gap-2">
              <Select value={novoMembroEquipe} onValueChange={setNovoMembroEquipe}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Adicionar membro" />
                </SelectTrigger>
                <SelectContent>
                  {membrosForaDaEquipe.map((membro) => (
                    <SelectItem key={membro.id} value={membro.id}>
                      {membro.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="sm" disabled={!novoMembroEquipe || salvandoEquipe} onClick={adicionarNaEquipe}>
                {salvandoEquipe ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Adicionar'}
              </Button>
            </div>
          )}
        </div>
      )}

      {isEditing && (
        <div className="space-y-2 rounded-md border p-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mover pra outro quadro/coluna</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select value={quadroDestino} onValueChange={setQuadroDestino}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quadros.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={colunaDestino} onValueChange={setColunaDestino}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colunasDoQuadroDestino.map((coluna: any) => (
                  <SelectItem key={coluna.id} value={coluna.id}>
                    {coluna.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={responsavelMove || '__nenhum__'} onValueChange={(v) => setResponsavelMove(v === '__nenhum__' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Responsável por esta etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__nenhum__">Sem responsável definido</SelectItem>
              {membros.map((membro) => (
                <SelectItem key={membro.id} value={membro.id}>
                  {membro.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={moverParaOutraColuna}
            disabled={movendo || colunaDestino === tarefa.colunaId}
          >
            {movendo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mover
          </Button>
        </div>
      )}

      {isEditing && (
        <div className="space-y-1.5 rounded-md border p-2">
          <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <Paperclip className="h-3.5 w-3.5" /> Anexos
          </Label>
          {carregandoAnexos ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <ul className="space-y-1 text-xs">
              {anexos.length === 0 && <li className="text-muted-foreground">Nenhum anexo ainda.</li>}
              {anexos.map((anexo) => (
                <li key={anexo.id}>
                  <button type="button" className="text-primary hover:underline" onClick={() => abrirAnexo(anexo)}>
                    {anexo.nomeArquivo}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input type="file" onChange={enviarAnexo} disabled={enviandoAnexo} className="text-xs" />
        </div>
      )}

      {isEditing && (
        <div className="space-y-1.5 rounded-md border p-2">
          <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <History className="h-3.5 w-3.5" /> Histórico
          </Label>
          {carregandoHistorico ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : historico.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem movimentação ainda.</p>
          ) : (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {historico.map((movimento) => {
                const origem = todasColunas.find((c: any) => c.id === movimento.colunaOrigemId)?.nome ?? 'criação';
                const destino = todasColunas.find((c: any) => c.id === movimento.colunaDestinoId)?.nome ?? '—';
                const responsavel = membros.find((m) => m.id === movimento.responsavelId)?.nome;
                return (
                  <li key={movimento.id}>
                    {new Date(movimento.criadoEm).toLocaleString('pt-BR')} -- {origem} → {destino}
                    {responsavel ? ` (responsável: ${responsavel})` : ''}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {isEditing ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" className="text-destructive" disabled={excluindo}>
                {excluindo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir esta tarefa?</AlertDialogTitle>
                <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={aoExcluir}>Confirmar exclusão</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <div />
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}

function ColunasDoQuadro({ empresaId, quadro, onAtualizado }: { empresaId: string; quadro: any; onAtualizado: () => void }) {
  const [colunas, setColunas] = useState<any[]>(quadro.colunas);
  const [novoNome, setNovoNome] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => setColunas(quadro.colunas), [quadro.colunas]);

  async function adicionar() {
    if (!novoNome.trim()) return;
    setSalvando(true);
    try {
      await criarColuna(empresaId, quadro.id, novoNome.trim(), false);
      setNovoNome('');
      onAtualizado();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível criar a coluna');
    } finally {
      setSalvando(false);
    }
  }

  async function renomear(coluna: any, nome: string) {
    try {
      await atualizarColuna(empresaId, quadro.id, coluna.id, { nome });
      onAtualizado();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível renomear a coluna');
    }
  }

  async function alternarFinal(coluna: any) {
    try {
      await atualizarColuna(empresaId, quadro.id, coluna.id, { ehFinal: !coluna.ehFinal });
      onAtualizado();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível alterar a coluna');
    }
  }

  async function mover(indice: number, direcao: number) {
    const alvo = indice + direcao;
    if (alvo < 0 || alvo >= colunas.length) return;
    const novaOrdem = [...colunas];
    [novaOrdem[indice], novaOrdem[alvo]] = [novaOrdem[alvo], novaOrdem[indice]];
    setColunas(novaOrdem);
    try {
      await reordenarColunas(empresaId, quadro.id, novaOrdem.map((c) => c.id));
      onAtualizado();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível reordenar');
      setColunas(quadro.colunas);
    }
  }

  async function excluir(coluna: any) {
    try {
      await excluirColuna(empresaId, quadro.id, coluna.id);
      showSuccess('Coluna excluída.');
      onAtualizado();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível excluir a coluna');
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {colunas.map((coluna, indice) => (
          <div key={coluna.id} className="flex items-center gap-2 rounded-md border p-2">
            <div className="flex flex-col">
              <Button size="sm" variant="ghost" className="h-5 w-5 p-0" disabled={indice === 0} onClick={() => mover(indice, -1)}>
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0"
                disabled={indice === colunas.length - 1}
                onClick={() => mover(indice, 1)}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
            <Input
              defaultValue={coluna.nome}
              className="h-8 flex-1"
              onBlur={(e) => {
                const valor = e.target.value.trim();
                if (valor && valor !== coluna.nome) renomear(coluna, valor);
              }}
            />
            <label className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
              <Checkbox checked={coluna.ehFinal} onCheckedChange={() => alternarFinal(coluna)} /> Final
            </label>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir coluna "{coluna.nome}"?</AlertDialogTitle>
                  <AlertDialogDescription>Só funciona se não tiver tarefa dentro. Essa ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => excluir(coluna)}>Confirmar exclusão</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input placeholder="Nova coluna" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
        <Button onClick={adicionar} disabled={salvando}>
          {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Adicionar
        </Button>
      </div>
    </div>
  );
}

function GerenciarQuadros({ empresaId, quadros, onAtualizado }: { empresaId: string; quadros: any[]; onAtualizado: () => void }) {
  const [novoNome, setNovoNome] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function adicionar() {
    if (!novoNome.trim()) return;
    setSalvando(true);
    try {
      await criarQuadro(empresaId, novoNome.trim());
      setNovoNome('');
      onAtualizado();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível criar o quadro');
    } finally {
      setSalvando(false);
    }
  }

  async function renomear(quadro: any, nome: string) {
    try {
      await atualizarQuadro(empresaId, quadro.id, nome);
      onAtualizado();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível renomear o quadro');
    }
  }

  async function excluir(quadro: any) {
    try {
      await excluirQuadro(empresaId, quadro.id);
      showSuccess('Quadro excluído.');
      onAtualizado();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível excluir o quadro');
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {quadros.map((quadro) => (
          <div key={quadro.id} className="flex items-center gap-2 rounded-md border p-2">
            <Input
              defaultValue={quadro.nome}
              className="h-8 flex-1"
              onBlur={(e) => {
                const valor = e.target.value.trim();
                if (valor && valor !== quadro.nome) renomear(quadro, valor);
              }}
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir quadro "{quadro.nome}"?</AlertDialogTitle>
                  <AlertDialogDescription>Só funciona se não tiver tarefa dentro. Essa ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => excluir(quadro)}>Confirmar exclusão</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input placeholder="Novo quadro" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
        <Button onClick={adicionar} disabled={salvando}>
          {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Adicionar
        </Button>
      </div>
    </div>
  );
}

/**
 * "Andre comentou na tarefa X", "Andre anexou arquivo.pdf", "Andre atribuiu a tarefa a
 * Fulano" -- timeline única da empresa inteira (todos os quadros), não só do quadro
 * selecionado no topo. Backend já devolve mais recente primeiro.
 */
function PipelineTarefas({ empresaId, tarefas, todasColunas, membros }: { empresaId: string; tarefas: any[]; todasColunas: any[]; membros: any[] }) {
  const [eventos, setEventos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    listarFeedTarefas(empresaId)
      .then(setEventos)
      .catch((e: any) => showError(e.message ?? 'Não foi possível carregar o pipeline'))
      .finally(() => setCarregando(false));
  }, [empresaId]);

  function nomeDe(usuarioId: string | null): string {
    if (!usuarioId) return 'ninguém';
    return membros.find((m) => m.id === usuarioId)?.nome ?? 'Usuário';
  }

  function linhaDoEvento(evento: any): { icone: JSX.Element; texto: string } {
    const titulo = tarefas.find((t) => t.id === evento.tarefaId)?.titulo ?? 'tarefa removida';

    if (evento.tipo === 'comentario') {
      return {
        icone: <MessageSquare className="h-4 w-4 text-primary" />,
        texto: `${nomeDe(evento.comentario.autorId)} comentou na tarefa "${titulo}": ${evento.comentario.corpo}`,
      };
    }
    if (evento.tipo === 'anexo') {
      return {
        icone: <Paperclip className="h-4 w-4 text-primary" />,
        texto: `${nomeDe(evento.anexo.criadoPor)} anexou "${evento.anexo.nomeArquivo}" na tarefa "${titulo}"`,
      };
    }
    if (evento.tipo === 'atribuicao') {
      const paraId = evento.atribuicao.paraUsuarioId;
      return {
        icone: <UserPlus className="h-4 w-4 text-primary" />,
        texto: paraId
          ? `${nomeDe(evento.atribuicao.atribuidoPor)} atribuiu a tarefa "${titulo}" a ${nomeDe(paraId)}`
          : `${nomeDe(evento.atribuicao.atribuidoPor)} removeu a atribuição da tarefa "${titulo}"`,
      };
    }
    // movimentacao
    const origem = todasColunas.find((c: any) => c.id === evento.movimento.colunaOrigemId)?.nome ?? 'criação';
    const destino = todasColunas.find((c: any) => c.id === evento.movimento.colunaDestinoId)?.nome ?? '—';
    return {
      icone: <History className="h-4 w-4 text-primary" />,
      texto: `${nomeDe(evento.movimento.movidoPor)} moveu a tarefa "${titulo}" de "${origem}" para "${destino}"`,
    };
  }

  if (carregando) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (eventos.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nada aconteceu nas tarefas ainda.</p>;
  }

  return (
    <ul className="space-y-2">
      {eventos.map((evento, indice) => {
        const { icone, texto } = linhaDoEvento(evento);
        return (
          <li key={indice} className="flex items-start gap-2 rounded-md border bg-card p-3 text-sm">
            {icone}
            <div className="flex-1">
              <p>{texto}</p>
              <p className="text-xs text-muted-foreground">{new Date(evento.criadoEm).toLocaleString('pt-BR')}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function Tarefas() {
  const { usuario } = useSelector((state: any) => state.autenticacao);
  const { empresaId, ehContador, ehPlataforma } = useEmpresaAtiva();
  const ehDono = PAPEIS_DONO.includes(usuario?.papel);

  const [quadros, setQuadros] = useState<any[]>([]);
  const [quadroSelecionadoId, setQuadroSelecionadoId] = useState<string | null>(null);
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [membros, setMembros] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [visualizacao, setVisualizacao] = useState('kanban');

  const [dialogTarefaAberto, setDialogTarefaAberto] = useState(false);
  const [tarefaEmEdicao, setTarefaEmEdicao] = useState<any | null>(null);
  const [colunaParaNovaTarefa, setColunaParaNovaTarefa] = useState<string | null>(null);
  const [dialogColunasAberto, setDialogColunasAberto] = useState(false);
  const [dialogQuadrosAberto, setDialogQuadrosAberto] = useState(false);

  function carregar() {
    if (!empresaId) return;
    setCarregando(true);
    const filtroEquipe = ehPlataforma ? { plataforma: true } : ehContador ? { somenteProprio: true } : undefined;
    Promise.all([listarQuadros(empresaId), listarTarefas(empresaId), listarUsuarios(filtroEquipe)])
      .then(([quadrosResp, tarefasResp, membrosResp]) => {
        setQuadros(quadrosResp);
        setTarefas(tarefasResp);
        setMembros(membrosResp);
        setQuadroSelecionadoId((atual) => (atual && quadrosResp.some((q: any) => q.id === atual) ? atual : quadrosResp[0]?.id ?? null));
      })
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId]);

  const quadroAtual = quadros.find((q) => q.id === quadroSelecionadoId) ?? null;
  const tarefasDoQuadro = tarefas.filter((t) => t.quadroId === quadroSelecionadoId);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function aoSoltar(event: any) {
    const { active, over } = event;
    if (!over || !quadroAtual) return;

    const tarefa = tarefasDoQuadro.find((t) => t.id === active.id);
    if (!tarefa) return;

    const colunaDestinoId = quadroAtual.colunas.some((c: any) => c.id === over.id)
      ? over.id
      : tarefasDoQuadro.find((t) => t.id === over.id)?.colunaId;
    if (!colunaDestinoId) return;

    const tarefasDestino = tarefasDoQuadro.filter((t) => t.colunaId === colunaDestinoId && t.id !== tarefa.id).sort((a, b) => a.ordem - b.ordem);
    const indiceSobre = tarefasDestino.findIndex((t) => t.id === over.id);
    const novaOrdem = indiceSobre === -1 ? tarefasDestino.length : indiceSobre;

    if (colunaDestinoId === tarefa.colunaId && novaOrdem === tarefa.ordem) return;

    setTarefas((atual) => atual.map((t) => (t.id === tarefa.id ? { ...t, colunaId: colunaDestinoId, ordem: novaOrdem } : t)));
    try {
      // Drag rápido não interrompe pra perguntar responsável -- usa o atribuído da
      // tarefa como responsável padrão da etapa; pra escolher outro, usa "Mover" no
      // detalhe do card.
      await moverTarefa(empresaId, tarefa.id, colunaDestinoId, novaOrdem, tarefa.atribuidoA ?? null);
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível mover a tarefa');
      carregar();
    }
  }

  if (!empresaId) {
    return (
      <LayoutPrincipal>
        <p className="text-sm text-muted-foreground">Selecione uma empresa.</p>
      </LayoutPrincipal>
    );
  }

  return (
    <LayoutPrincipal>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <ClipboardList className="mr-2 h-6 w-6" /> Tarefas
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {visualizacao !== 'pipeline' && (
            <Select value={quadroSelecionadoId ?? ''} onValueChange={setQuadroSelecionadoId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Quadro" />
              </SelectTrigger>
              <SelectContent>
                {quadros.map((quadro) => (
                  <SelectItem key={quadro.id} value={quadro.id}>
                    {quadro.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Tabs value={visualizacao} onValueChange={setVisualizacao}>
            <TabsList>
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
              <TabsTrigger value="lista">Lista</TabsTrigger>
              <TabsTrigger value="pipeline">
                <Rss className="mr-1.5 h-3.5 w-3.5" /> Pipeline
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {ehDono && visualizacao !== 'pipeline' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setDialogQuadrosAberto(true)}>
                <Layers className="mr-2 h-4 w-4" /> Quadros
              </Button>
              {quadroAtual && (
                <Button variant="outline" size="sm" onClick={() => setDialogColunasAberto(true)}>
                  <Settings className="mr-2 h-4 w-4" /> Colunas
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {visualizacao === 'pipeline' ? (
        <PipelineTarefas empresaId={empresaId} tarefas={tarefas} todasColunas={quadros.flatMap((q) => q.colunas)} membros={membros} />
      ) : carregando || !quadroAtual ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : visualizacao === 'kanban' ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={aoSoltar}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {quadroAtual.colunas.map((coluna: any) => (
              <ColunaKanban
                key={coluna.id}
                coluna={coluna}
                tarefas={tarefasDoQuadro.filter((t) => t.colunaId === coluna.id).sort((a, b) => a.ordem - b.ordem)}
                membros={membros}
                empresaId={empresaId}
                usuarioAtualId={usuario?.id}
                onAbrirTarefa={(t) => {
                  setTarefaEmEdicao(t);
                  setDialogTarefaAberto(true);
                }}
                onNovaTarefa={(colunaId) => {
                  setTarefaEmEdicao(null);
                  setColunaParaNovaTarefa(colunaId);
                  setDialogTarefaAberto(true);
                }}
                onAtribuido={(tarefaId, novoAtribuidoA) => {
                  setTarefas((atual) => atual.map((t) => (t.id === tarefaId ? { ...t, atribuidoA: novoAtribuidoA } : t)));
                }}
              />
            ))}
          </div>
        </DndContext>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Coluna</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Tempo est.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tarefasDoQuadro.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhuma tarefa neste quadro.
                  </TableCell>
                </TableRow>
              ) : (
                tarefasDoQuadro.map((tarefa) => {
                  const coluna = quadroAtual.colunas.find((c: any) => c.id === tarefa.colunaId);
                  const membro = membros.find((m) => m.id === tarefa.atribuidoA);
                  const prioridade = ROTULO_PRIORIDADE[tarefa.prioridade] ?? ROTULO_PRIORIDADE.media;
                  return (
                    <TableRow
                      key={tarefa.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setTarefaEmEdicao(tarefa);
                        setDialogTarefaAberto(true);
                      }}
                    >
                      <TableCell className="font-medium">{tarefa.titulo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{coluna?.nome ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{membro?.nome ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={prioridade.variante}>{prioridade.texto}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatarPrazo(tarefa.prazo) ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tarefa.tempoEstimadoHoras != null ? `${tarefa.tempoEstimadoHoras}h` : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogTarefaAberto} onOpenChange={setDialogTarefaAberto}>
        <DialogContent className="max-w-sm md:max-w-[85%]">
          <DialogHeader>
            <DialogTitle>{tarefaEmEdicao ? 'Tarefa' : 'Nova tarefa'}</DialogTitle>
          </DialogHeader>
          {quadroAtual && (
            <FormTarefa
              empresaId={empresaId}
              tarefa={tarefaEmEdicao}
              colunaId={colunaParaNovaTarefa}
              quadros={quadros}
              membros={membros}
              onSalvo={() => {
                setDialogTarefaAberto(false);
                carregar();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogColunasAberto} onOpenChange={setDialogColunasAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Colunas -- {quadroAtual?.nome}</DialogTitle>
          </DialogHeader>
          {quadroAtual && <ColunasDoQuadro empresaId={empresaId} quadro={quadroAtual} onAtualizado={carregar} />}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogQuadrosAberto} onOpenChange={setDialogQuadrosAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Gerenciar quadros</DialogTitle>
          </DialogHeader>
          <GerenciarQuadros empresaId={empresaId} quadros={quadros} onAtualizado={carregar} />
        </DialogContent>
      </Dialog>
    </LayoutPrincipal>
  );
}
