import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Loader2, QrCode } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listarPendenciasAtivacao } from '../servicos/pagbankLicencas';
import { showError } from '../utils/toast';

const formatarMoeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

/**
 * Lado JOTA FISCAL: a empresa vê e paga aqui as pendências de ativação de módulo que o
 * contador iniciou pra ela -- sem depender do contador repassar o código PIX por fora
 * (WhatsApp, e-mail etc).
 */
export default function PendenciasAtivacaoModulo() {
  const { usuario } = useSelector((state: any) => state.autenticacao);
  const empresaId = usuario?.empresaId ?? null;

  const [pendencias, setPendencias] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  function carregar() {
    if (!empresaId) return;
    setCarregando(true);
    listarPendenciasAtivacao(empresaId)
      .then(setPendencias)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId]);

  if (!empresaId) {
    return (
      <LayoutPrincipal>
        <p className="text-sm text-muted-foreground">Esta tela mostra as pendências de pagamento da sua empresa.</p>
      </LayoutPrincipal>
    );
  }

  return (
    <LayoutPrincipal>
      <h1 className="mb-6 flex items-center text-2xl font-bold md:text-3xl">
        <QrCode className="mr-2 h-6 w-6" /> Pendências de Ativação de Módulo
      </h1>

      {carregando ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : pendencias.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma pendência de pagamento no momento.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {pendencias.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-base">{formatarMoeda(p.valorTotal)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-center">
                {p.pixQrUrl && <img src={p.pixQrUrl} alt="QR code PIX" className="mx-auto h-44 w-44" />}
                {p.pixCode && (
                  <div className="space-y-1 text-left">
                    <Label className="text-xs">Código PIX (copiar e colar)</Label>
                    <Input readOnly value={p.pixCode} onClick={(e) => (e.target as HTMLInputElement).select()} />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  O módulo é liberado automaticamente assim que o pagamento for confirmado.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </LayoutPrincipal>
  );
}
