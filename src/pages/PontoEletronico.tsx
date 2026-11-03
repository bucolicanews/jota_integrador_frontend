import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AlertTriangle, Clock, Loader2, LogIn, LogOut, MapPin } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DetalheFolhaPonto from '../components/ponto/DetalheFolhaPonto';
import { useGeolocation, type Coordenadas } from '../hooks/useGeolocation';
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
  const [selfie, setSelfie] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [usarManual, setUsarManual] = useState(false);
  const [latManual, setLatManual] = useState('');
  const [lngManual, setLngManual] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmAberto, setConfirmAberto] = useState(false);
  const [coordenadasConfirmacao, setCoordenadasConfirmacao] = useState<Coordenadas | null>(null);
  const geo = useGeolocation();

  function carregar() {
    if (!podeBater) return;
    const agora = new Date();
    listarRegistros({ ano: agora.getFullYear(), mes: agora.getMonth() + 1 })
      .then(setRegistrosMes)
      .catch((e) => showError(e.message));
  }
  useEffect(carregar, [podeBater]);

  const hojeStr = new Date().toISOString().slice(0, 10);
  const batidasHoje = registrosMes.filter((r) => (r.tipo === 'entrada' || r.tipo === 'saida') && r.horarioRegistro.slice(0, 10) === hojeStr);
  const ultimaBatida = batidasHoje[batidasHoje.length - 1];
  const proximaAcao: 'entrada' | 'saida' = !ultimaBatida || ultimaBatida.tipo === 'saida' ? 'entrada' : 'saida';

  const horasDesdeEntrada =
    ultimaBatida?.tipo === 'entrada' ? (Date.now() - new Date(ultimaBatida.horarioRegistro).getTime()) / 3_600_000 : 0;
  const alertaQuatroHoras = proximaAcao === 'saida' && horasDesdeEntrada >= 4;

  async function prepararConfirmacao() {
    if (!selfie) {
      showError('Tire ou selecione a selfie antes de confirmar.');
      return;
    }
    let coordenadas = geo.coordenadas;
    if (usarManual && latManual && lngManual) {
      coordenadas = { latitude: Number(latManual), longitude: Number(lngManual) };
    } else if (!coordenadas) {
      coordenadas = await geo.obterLocalizacao();
    }
    setCoordenadasConfirmacao(coordenadas);
    setConfirmAberto(true);
  }

  async function confirmarBatida() {
    setEnviando(true);
    try {
      await registrarBatida({
        selfie,
        latitude: coordenadasConfirmacao?.latitude ?? null,
        longitude: coordenadasConfirmacao?.longitude ?? null,
      });
      showSuccess(`${ROTULO_TIPO[proximaAcao]} registrada com sucesso.`);
      setSelfie(null);
      carregar();
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível registrar a batida');
    } finally {
      setEnviando(false);
      setConfirmAberto(false);
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

      <div className="space-y-6">
        <Card className="max-w-xl">
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

            <Button onClick={prepararConfirmacao} disabled={enviando || !selfie} className="w-full">
              {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : proximaAcao === 'entrada' ? <LogIn className="mr-2 h-4 w-4" /> : <LogOut className="mr-2 h-4 w-4" />}
              Confirmar {ROTULO_TIPO[proximaAcao]}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Minha folha de ponto</CardTitle>
          </CardHeader>
          <CardContent>
            <DetalheFolhaPonto key={refreshKey} funcionario={{ id: usuario.id, nome: usuario.nome, email: usuario.email }} somenteLeitura />
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmAberto} onOpenChange={setConfirmAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar registro de ponto</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              Você está prestes a registrar <span className="font-semibold">{ROTULO_TIPO[proximaAcao]}</span>.
            </p>
            {coordenadasConfirmacao ? (
              <p className="text-xs text-muted-foreground">
                Localização: {coordenadasConfirmacao.latitude.toFixed(5)}, {coordenadasConfirmacao.longitude.toFixed(5)}
              </p>
            ) : (
              <p className="flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" /> Sem localização -- o registro ficará sem coordenadas.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAberto(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button onClick={confirmarBatida} disabled={enviando}>
              {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutPrincipal>
  );
}
