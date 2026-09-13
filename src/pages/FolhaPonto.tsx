import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import DetalheFolhaPonto from '../components/ponto/DetalheFolhaPonto';
import { listarContadores } from '../servicos/contadores';
import { listarUsuarios } from '../servicos/usuarios';
import { showError } from '../utils/toast';

const ROTULO_PAPEL: Record<string, string> = { OPERADOR_CONTADOR: 'Operador do escritório', OPERADOR_EMPRESA: 'Operador da empresa' };

export default function FolhaPonto() {
  const { usuario } = useSelector((state: any) => state.autenticacao);
  const papelAtual = usuario?.papel;
  const podeGerenciar = ['SUPER_ADMIN', 'CONTADOR_DONO', 'EMPRESARIO_DONO'].includes(papelAtual);

  const [contadores, setContadores] = useState<any[]>([]);
  const [contadorFiltro, setContadorFiltro] = useState('');
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<any | null>(null);

  useEffect(() => {
    if (papelAtual === 'SUPER_ADMIN') {
      listarContadores()
        .then(setContadores)
        .catch((e) => showError(e.message));
    }
  }, [papelAtual]);

  function carregar() {
    if (papelAtual === 'SUPER_ADMIN' && !contadorFiltro) {
      setFuncionarios([]);
      return;
    }
    setCarregando(true);
    const contadorId = papelAtual === 'SUPER_ADMIN' ? contadorFiltro : undefined;
    listarUsuarios(contadorId ? { contadorId } : {})
      .then((lista) => setFuncionarios(lista.filter((u: any) => u.papel === 'OPERADOR_CONTADOR' || u.papel === 'OPERADOR_EMPRESA')))
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [papelAtual, contadorFiltro]);

  if (!papelAtual) return null;

  if (!podeGerenciar) {
    return (
      <LayoutPrincipal>
        <p className="text-sm text-muted-foreground">Você não tem acesso a esta tela.</p>
      </LayoutPrincipal>
    );
  }

  if (funcionarioSelecionado) {
    return (
      <LayoutPrincipal>
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => setFuncionarioSelecionado(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar pra lista
        </Button>
        <DetalheFolhaPonto funcionario={funcionarioSelecionado} />
      </LayoutPrincipal>
    );
  }

  return (
    <LayoutPrincipal>
      <h1 className="mb-6 flex items-center text-2xl font-bold md:text-3xl">
        <Users className="mr-2 h-6 w-6" /> Folha de Ponto
      </h1>

      {papelAtual === 'SUPER_ADMIN' && (
        <div className="mb-4 max-w-xs space-y-1.5">
          <Label>Contador</Label>
          <Select value={contadorFiltro} onValueChange={setContadorFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um contador" />
            </SelectTrigger>
            <SelectContent>
              {contadores.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome ?? c.razaoSocial}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
                    <TableHead>Email</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead className="w-[100px] text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funcionarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        {papelAtual === 'SUPER_ADMIN' && !contadorFiltro ? 'Selecione um contador pra ver a equipe.' : 'Nenhum funcionário cadastrado.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    funcionarios.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.nome}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{f.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{ROTULO_PAPEL[f.papel] ?? f.papel}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => setFuncionarioSelecionado(f)}>
                            Ver folha
                          </Button>
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
    </LayoutPrincipal>
  );
}
