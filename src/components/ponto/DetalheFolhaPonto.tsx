import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Loader2, Printer, TrendingUp, Umbrella } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AjustarRegistrosDialog from './AjustarRegistrosDialog';
import GerenciarFaltaAbonoDialog from './GerenciarFaltaAbonoDialog';
import GerenciarFeriasDialog from './GerenciarFeriasDialog';
import GerenciarFolgaTrabalhadaDialog from './GerenciarFolgaTrabalhadaDialog';
import { excluirRegistro, listarRegistros, obterResumoMensal } from '../../servicos/pontoEletronico';
import { imprimirFolhaPonto } from '../../utils/imprimirFolhaPonto';
import { showError, showSuccess } from '../../utils/toast';

const ROTULO_TIPO: Record<string, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  falta: 'Falta',
  abono: 'Abono',
  compensacao: 'Compensação',
  extra100: 'Extra 100%',
};

function formatarMinutos(minutos: number): string {
  const sinal = minutos < 0 ? '-' : '';
  const absolutos = Math.abs(minutos);
  return `${sinal}${Math.floor(absolutos / 60)}h${String(absolutos % 60).padStart(2, '0')}`;
}

function CardResumo({ label, valor, icone: Icone, cor }: { label: string; valor: string | number; icone: any; cor: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icone className={cn('h-5 w-5 shrink-0', cor)} />
        <div>
          <p className="text-lg font-bold leading-none">{valor}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DetalheFolhaPonto({ funcionario }: { funcionario: any }) {
  const agora = new Date();
  const [ano, setAno] = useState(agora.getFullYear());
  const [mes, setMes] = useState(agora.getMonth() + 1);
  const [registros, setRegistros] = useState<any[]>([]);
  const [resumo, setResumo] = useState<any | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [dialogFaltaAbono, setDialogFaltaAbono] = useState(false);
  const [dialogFerias, setDialogFerias] = useState(false);
  const [dialogFolga, setDialogFolga] = useState<{ aberto: boolean; data?: string }>({ aberto: false });
  const [dialogAjuste, setDialogAjuste] = useState<{ aberto: boolean; data: string; batidas: any[] }>({ aberto: false, data: '', batidas: [] });

  function carregar() {
    setCarregando(true);
    setErro(null);
    Promise.all([listarRegistros({ usuarioId: funcionario.id, ano, mes }), obterResumoMensal({ usuarioId: funcionario.id, ano, mes })])
      .then(([listaRegistros, resumoDados]) => {
        setRegistros(listaRegistros);
        setResumo(resumoDados);
      })
      .catch((e) => {
        setErro(e.message ?? 'Não foi possível carregar a folha de ponto');
        showError(e.message);
      })
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [funcionario.id, ano, mes]);

  function mudarMes(delta: number) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes > 12) {
      novoMes = 1;
      novoAno += 1;
    } else if (novoMes < 1) {
      novoMes = 12;
      novoAno -= 1;
    }
    setMes(novoMes);
    setAno(novoAno);
  }

  const porDia: Record<string, any[]> = {};
  for (const registro of registros) {
    const dia = registro.horarioRegistro.slice(0, 10);
    if (!porDia[dia]) porDia[dia] = [];
    porDia[dia].push(registro);
  }
  const diasOrdenados = Object.keys(porDia).sort();

  function abrirAjusteDoDia(dia: string) {
    const batidasDoDia = (porDia[dia] ?? [])
      .filter((r) => r.tipo === 'entrada' || r.tipo === 'saida')
      .map((r) => ({ tipo: r.tipo, horarioLocal: new Date(r.horarioRegistro).toISOString().slice(0, 16) }));
    setDialogAjuste({ aberto: true, data: dia, batidas: batidasDoDia });
  }

  async function excluir(id: string) {
    try {
      await excluirRegistro(id);
      showSuccess('Registro excluído.');
      carregar();
    } catch (e: any) {
      showError(e.message);
    }
  }

  function imprimir() {
    if (!resumo) return;
    const ok = imprimirFolhaPonto({ funcionario, ano, mes, registros, resumo });
    if (!ok) showError('Popup bloqueado! Permita popups para imprimir.');
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{funcionario.nome}</h2>
          <p className="text-sm text-muted-foreground">{funcionario.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => mudarMes(-1)}>
            ‹
          </Button>
          <span className="text-sm font-medium">
            {String(mes).padStart(2, '0')}/{ano}
          </span>
          <Button size="sm" variant="outline" onClick={() => mudarMes(1)}>
            ›
          </Button>
        </div>
      </div>

      {carregando ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : erro || !resumo ? (
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">{erro ?? 'Não foi possível carregar a folha de ponto.'}</p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <CardResumo label="Jornada" valor={formatarMinutos(resumo.jornadaMinutos)} icone={Clock} cor="text-muted-foreground" />
            <CardResumo label="Trabalhado" valor={formatarMinutos(resumo.trabalhadoMinutos)} icone={CheckCircle2} cor="text-primary" />
            <CardResumo
              label="Saldo"
              valor={formatarMinutos(resumo.saldoMinutos)}
              icone={TrendingUp}
              cor={resumo.saldoMinutos < 0 ? 'text-destructive' : 'text-green-600'}
            />
            <CardResumo label="Extra 100%" valor={formatarMinutos(resumo.extra100Minutos)} icone={TrendingUp} cor="text-blue-600" />
            <CardResumo label="Faltas Injustif." valor={resumo.diasComFaltaInjustificada} icone={AlertTriangle} cor="text-destructive" />
            <CardResumo label="Férias (dias)" valor={resumo.diasFerias} icone={Umbrella} cor="text-muted-foreground" />
          </div>

          {resumo.diasQuePrecisamGestao.length > 0 && (
            <div className="mb-4 rounded-md bg-amber-100 p-3 text-sm text-amber-900">
              <p className="mb-1 flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" /> Dias de folga fixa trabalhados sem decisão:
              </p>
              <div className="flex flex-wrap gap-2">
                {resumo.diasQuePrecisamGestao.map((dia: string) => (
                  <Button key={dia} size="sm" variant="outline" className="h-7 bg-white text-xs" onClick={() => setDialogFolga({ aberto: true, data: dia })}>
                    {new Date(`${dia}T00:00:00`).toLocaleDateString('pt-BR')}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setDialogFaltaAbono(true)}>
              Falta / Abono
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDialogFolga({ aberto: true })}>
              Folga Trabalhada
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDialogFerias(true)}>
              Férias
            </Button>
            <Button size="sm" variant="outline" onClick={imprimir}>
              <Printer className="mr-2 h-3.5 w-3.5" /> Imprimir
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Registros (clique pra excluir um)</TableHead>
                      <TableHead className="w-[100px] text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diasOrdenados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                          Nenhum registro neste mês.
                        </TableCell>
                      </TableRow>
                    ) : (
                      diasOrdenados.map((dia) => (
                        <TableRow key={dia}>
                          <TableCell className="text-sm font-medium">{new Date(`${dia}T00:00:00`).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {porDia[dia].map((r: any) => (
                                <Badge
                                  key={r.id}
                                  variant={r.tipo === 'entrada' ? 'success' : r.tipo === 'saida' ? 'secondary' : 'outline'}
                                  className="cursor-pointer"
                                  onClick={() => excluir(r.id)}
                                  title="Clique pra excluir"
                                >
                                  {ROTULO_TIPO[r.tipo] ?? r.tipo} {new Date(r.horarioRegistro).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => abrirAjusteDoDia(dia)}>
                              Ajustar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <GerenciarFaltaAbonoDialog funcionarioId={funcionario.id} open={dialogFaltaAbono} onOpenChange={setDialogFaltaAbono} onSalvo={carregar} />
      <GerenciarFolgaTrabalhadaDialog
        funcionarioId={funcionario.id}
        data={dialogFolga.data}
        open={dialogFolga.aberto}
        onOpenChange={(aberto) => setDialogFolga({ aberto })}
        onSalvo={carregar}
      />
      <GerenciarFeriasDialog funcionarioId={funcionario.id} open={dialogFerias} onOpenChange={setDialogFerias} onSalvo={carregar} />
      <AjustarRegistrosDialog
        funcionarioId={funcionario.id}
        data={dialogAjuste.data}
        batidasIniciais={dialogAjuste.batidas}
        open={dialogAjuste.aberto}
        onOpenChange={(aberto) => setDialogAjuste((s) => ({ ...s, aberto }))}
        onSalvo={carregar}
      />
    </div>
  );
}
