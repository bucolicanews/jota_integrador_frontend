import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AlertTriangle, Clock, Loader2, LogIn, LogOut, MapPin } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGeolocation } from '../hooks/useGeolocation';
import { listarRegistros, registrarBatida } from '../servicos/pontoEletronico';
import { showError, showSuccess } from '../utils/toast';

const ROTULO_TIPO: Record<string, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  falta: 'Falta',
  abono: 'Abono',
  compensacao: 'Compensação',
  extra100: 'Extra 100%',
};

export default function PontoEletronico() {
  const { usuario } = useSelector((state: any) => state.autenticacao);
  const podeBater = usuario?.papel === 'OPERADOR_CONTADOR' || usuario?.papel === 'OPERADOR_EMPRESA';

  const [registrosMes, setRegistrosMes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [usarManual, setUsarManual] = useState(false);
  const [latManual, setLatManual] = useState('');
  const [lngManual, setLngManual] = useState('');
  const geo = useGeolocation();

  function carregar() {
    if (!podeBater) return;
    const agora = new Date();
    setCarregando(true);
    listarRegistros({ ano: agora.getFullYear(), mes: agora.getMonth() + 1 })
      .then(setRegistrosMes)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [podeBater]);

  const hojeStr = new Date().toISOString().slice(0, 10);
  const batidasHoje = registrosMes.filter((r) => (r.tipo === 'entrada' || r.tipo === 'saida') && r.horarioRegistro.slice(0, 10) === hojeStr);
  const ultimaBatida = batidasHoje[batidasHoje.length - 1];
  const proximaAcao: 'entrada' | 'saida' = !ultimaBatida || ultimaBatida.tipo === 'saida' ? 'entrada' : 'saida';

  const horasDesdeEntrada =
    ultimaBatida?.tipo === 'entrada' ? (Date.now() - new Date(ultimaBatida.horarioRegistro).getTime()) / 3_600_000 : 0;
  const alertaQuatroHoras = proximaAcao === 'saida' && horasDesdeEntrada >= 4;

  async function confirmarBatida() {
    if (!selfie) {
      showError('Tire ou selecione a selfie antes de confirmar.');
      return;
    }
    setEnviando(true);
    try {
      let coordenadas = geo.coordenadas;
      if (usarManual && latManual && lngManual) {
        coordenadas = { latitude: Number(latManual), longitude: Number(lngManual) };
      } else if (!coordenadas) {
        coordenadas = await geo.obterLocalizacao();
      }

      await registrarBatida({ selfie, latitude: coordenadas?.latitude ?? null, longitude: coordenadas?.longitude ?? null });
      showSuccess(`${ROTULO_TIPO[proximaAcao]} registrada com sucesso.`);
      setSelfie(null);
      carregar();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível registrar a batida');
    } finally {
      setEnviando(false);
    }
  }

  if (!usuario) return null;

  if (!podeBater) {
    return (
      <LayoutPrincipal>
        <p className="text-sm text-muted-foreground">Você não tem acesso a esta tela.</p>
      </LayoutPrincipal>
    );
  }

  return (
    <LayoutPrincipal>
      <h1 className="mb-6 flex items-center text-2xl font-bold md:text-3xl">
        <Clock className="mr-2 h-6 w-6" /> Bater Ponto
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrar {ROTULO_TIPO[proximaAcao]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertaQuatroHoras && (
              <div className="flex items-center gap-2 rounded-md bg-amber-100 p-3 text-sm text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Já se passaram mais de 4h desde a entrada -- não esqueça de bater a saída.
              </div>
            )}

            <div className="space-y-1.5">
              <Label>1. Selfie *</Label>
              <Input type="file" accept="image/*" capture="user" onChange={(e) => setSelfie(e.target.files?.[0] ?? null)} />
              {selfie && <p className="text-xs text-muted-foreground">Selecionada: {selfie.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>2. Localização</Label>
              {!usarManual && (
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => geo.obterLocalizacao()} disabled={geo.obtendo}>
                    {geo.obtendo ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <MapPin className="mr-2 h-3.5 w-3.5" />}
                    Obter localização
                  </Button>
                  {geo.coordenadas && (
                    <span className="text-xs text-muted-foreground">
                      {geo.coordenadas.latitude.toFixed(5)}, {geo.coordenadas.longitude.toFixed(5)}
                    </span>
                  )}
                </div>
              )}
              {geo.erro && !usarManual && (
                <div className="space-y-1">
                  <p className="text-xs text-destructive">{geo.erro}</p>
                  <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setUsarManual(true)}>
                    Informar localização manualmente
                  </Button>
                </div>
              )}
              {usarManual && (
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Latitude" value={latManual} onChange={(e) => setLatManual(e.target.value)} />
                  <Input placeholder="Longitude" value={lngManual} onChange={(e) => setLngManual(e.target.value)} />
                </div>
              )}
            </div>

            <Button onClick={confirmarBatida} disabled={enviando || !selfie} className="w-full">
              {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : proximaAcao === 'entrada' ? <LogIn className="mr-2 h-4 w-4" /> : <LogOut className="mr-2 h-4 w-4" />}
              Confirmar {ROTULO_TIPO[proximaAcao]}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meu ponto -- este mês</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {carregando ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrosMes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                          Nenhum registro neste mês ainda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      [...registrosMes]
                        .reverse()
                        .map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-sm">{new Date(r.horarioRegistro).toLocaleString('pt-BR')}</TableCell>
                            <TableCell>
                              <Badge variant={r.tipo === 'entrada' ? 'success' : r.tipo === 'saida' ? 'secondary' : 'outline'}>
                                {ROTULO_TIPO[r.tipo] ?? r.tipo}
                              </Badge>
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
      </div>
    </LayoutPrincipal>
  );
}
