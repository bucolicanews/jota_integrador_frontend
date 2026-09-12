import { useEffect, useState } from 'react';
import { Loader2, PlusCircle, Trash2, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { showError, showSuccess } from '../../utils/toast';

interface Item {
  id: string;
  descricao: string;
}

interface ListaPicklistExtratoProps {
  empresaId: string;
  placeholder: string;
  listar: (empresaId: string) => Promise<Item[]>;
  criar: (empresaId: string, descricao: string) => Promise<Item>;
  atualizar: (empresaId: string, id: string, descricao: string) => Promise<void>;
  excluir: (empresaId: string, id: string) => Promise<void>;
}

/** Lista simples de sugestões (descrição livre) -- compartilhada entre Descrições e Identificadores de Extrato, mesma estrutura, só troca os serviços chamados. */
export default function ListaPicklistExtrato({ empresaId, placeholder, listar, criar, atualizar, excluir }: ListaPicklistExtratoProps) {
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [novoTexto, setNovoTexto] = useState('');
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEdicao, setTextoEdicao] = useState('');
  const [excluindo, setExcluindo] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    listar(empresaId)
      .then(setItens)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId]);

  async function aoCriar() {
    if (!novoTexto.trim()) return;
    setSalvandoNovo(true);
    try {
      await criar(empresaId, novoTexto.trim());
      setNovoTexto('');
      carregar();
    } catch (erro: any) {
      showError(erro.message);
    } finally {
      setSalvandoNovo(false);
    }
  }

  function iniciarEdicao(item: Item) {
    setEditandoId(item.id);
    setTextoEdicao(item.descricao);
  }

  async function salvarEdicao(id: string) {
    if (!textoEdicao.trim()) return;
    try {
      await atualizar(empresaId, id, textoEdicao.trim());
      setEditandoId(null);
      showSuccess('Atualizado.');
      carregar();
    } catch (erro: any) {
      showError(erro.message);
    }
  }

  async function aoExcluir(id: string) {
    setExcluindo(id);
    try {
      await excluir(empresaId, id);
      showSuccess('Excluído.');
      carregar();
    } catch (erro: any) {
      showError(erro.message);
    } finally {
      setExcluindo(null);
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex gap-2">
          <Input placeholder={placeholder} value={novoTexto} onChange={(e) => setNovoTexto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && aoCriar()} />
          <Button onClick={aoCriar} disabled={!novoTexto.trim() || salvandoNovo}>
            {salvandoNovo ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
          </Button>
        </div>

        {carregando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[90px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-20 text-center text-muted-foreground">
                      Nenhum item cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  itens.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">
                        {editandoId === item.id ? (
                          <Input
                            value={textoEdicao}
                            onChange={(e) => setTextoEdicao(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && salvarEdicao(item.id)}
                            className="h-8"
                            autoFocus
                          />
                        ) : (
                          <span className="cursor-pointer" onClick={() => iniciarEdicao(item)}>
                            {item.descricao}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {editandoId === item.id ? (
                            <>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => salvarEdicao(item.id)}>
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditandoId(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" disabled={excluindo === item.id}>
                                  {excluindo === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir este item?</AlertDialogTitle>
                                  <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => aoExcluir(item.id)}>Confirmar exclusão</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
