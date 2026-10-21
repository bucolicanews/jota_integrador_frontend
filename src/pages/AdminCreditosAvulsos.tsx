import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Coins, Loader2, Power, PowerOff, PlusCircle } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { atualizarPacoteCreditoAvulso, criarPacoteCreditoAvulso, listarPacotesCreditosAvulsos } from '../servicos/creditosAvulsos';
import { showError, showSuccess } from '../utils/toast';

interface DadosFormulario {
  nome: string;
  quantidadeCreditos: number;
  precoReais: number;
}

function FormPacote({ pacoteInicial, onSaveComplete }: { pacoteInicial?: any | null; onSaveComplete: () => void }) {
  const isEditing = !!pacoteInicial;
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DadosFormulario>({
    defaultValues: {
      nome: pacoteInicial?.nome ?? '',
      quantidadeCreditos: pacoteInicial?.quantidadeCreditos ?? 0,
      precoReais: pacoteInicial?.precoReais ?? 0,
    },
  });

  async function aoSubmeter(dados: DadosFormulario) {
    setErroGeral(null);
    const payload = {
      nome: dados.nome,
      quantidadeCreditos: Number(dados.quantidadeCreditos),
      precoReais: Number(dados.precoReais),
    };
    try {
      if (isEditing) {
        await atualizarPacoteCreditoAvulso(pacoteInicial.id, payload);
      } else {
        await criarPacoteCreditoAvulso(payload);
      }
      showSuccess(`Pacote ${isEditing ? 'atualizado' : 'criado'} com sucesso.`);
      onSaveComplete();
    } catch (e: any) {
      setErroGeral(e.message ?? 'Não foi possível salvar o pacote');
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Nome *</Label>
        <Input placeholder="Ex: Pacote 50 créditos" {...register('nome', { required: true, minLength: 2 })} />
        {errors.nome && <p className="text-xs text-destructive">Obrigatório (mín. 2 caracteres)</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Créditos *</Label>
          <Input type="number" step="1" min="1" {...register('quantidadeCreditos', { required: true, valueAsNumber: true, min: 1 })} />
          {errors.quantidadeCreditos && <p className="text-xs text-destructive">Informe um valor válido</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Preço (R$) *</Label>
          <Input type="number" step="0.01" min="0.01" {...register('precoReais', { required: true, valueAsNumber: true, min: 0.01 })} />
          {errors.precoReais && <p className="text-xs text-destructive">Informe um valor válido</p>}
        </div>
      </div>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEditing ? 'Salvar alterações' : 'Criar pacote'}
      </Button>
    </form>
  );
}

/**
 * Catálogo de pacotes de crédito avulso (top-up pontual) -- diferente de AdminPlanos
 * (assinatura recorrente com split de contador), aqui é compra direta empresa/contador
 * -> plataforma, sempre 100% Jota.
 */
export default function AdminCreditosAvulsos() {
  const [pacotes, setPacotes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [pacoteParaEditar, setPacoteParaEditar] = useState<any | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    listarPacotesCreditosAvulsos()
      .then(setPacotes)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, []);

  async function alternarAtivo(pacote: any) {
    setProcessando(pacote.id);
    try {
      await atualizarPacoteCreditoAvulso(pacote.id, { ativo: !pacote.ativo });
      showSuccess(pacote.ativo ? 'Pacote desativado.' : 'Pacote reativado.');
      carregar();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setProcessando(null);
    }
  }

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <Coins className="mr-2 h-6 w-6" /> Pacotes de Crédito Avulso
        </h1>
        <Button
          onClick={() => {
            setPacoteParaEditar(null);
            setDialogAberto(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Novo pacote
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Top-up pontual que a empresa-cliente (ou o contador em nome dela) compra direto da plataforma, fora de
        qualquer plano/assinatura -- sem split, 100% Jota.
      </p>

      <Card>
        <CardContent className="p-0">
          {carregando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Créditos</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                    <TableHead className="w-[140px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pacotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Nenhum pacote cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pacotes.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.quantidadeCreditos}</TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.precoReais)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.ativo ? 'success' : 'secondary'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setPacoteParaEditar(p);
                                setDialogAberto(true);
                              }}
                            >
                              Editar
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => alternarAtivo(p)} disabled={processando === p.id}>
                              {processando === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : p.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                            </Button>
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

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto md:max-w-[70%]">
          <DialogHeader>
            <DialogTitle>{pacoteParaEditar ? 'Editar pacote' : 'Novo pacote'}</DialogTitle>
          </DialogHeader>
          <FormPacote
            pacoteInicial={pacoteParaEditar}
            onSaveComplete={() => {
              setDialogAberto(false);
              carregar();
            }}
          />
        </DialogContent>
      </Dialog>
    </LayoutPrincipal>
  );
}
