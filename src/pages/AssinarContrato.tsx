import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, FileSignature, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { obterContratoPublico, assinarContratoPublico } from '../servicos/contratos';

const fmt = (v: number | null) => (v == null ? null : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v));

/**
 * Rota PÚBLICA, fora de RotaProtegida/RotaPublica -- cliente final assina sem login.
 * Sem captura de câmera ao vivo: <input capture="user"> abre a câmera frontal no
 * mobile, cai pra upload normal no desktop (simplificação deliberada da Fase 6).
 */
export default function AssinarContrato() {
  const { token } = useParams();
  const [contrato, setContrato] = useState<any | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [selfie, setSelfie] = useState<File | null>(null);
  const [assinando, setAssinando] = useState(false);
  const [erroAssinar, setErroAssinar] = useState<string | null>(null);
  const [assinado, setAssinado] = useState(false);

  useEffect(() => {
    if (!token) return;
    obterContratoPublico(token)
      .then(setContrato)
      .catch((e) => setErroCarregar(e.message ?? 'Contrato não encontrado'))
      .finally(() => setCarregando(false));
  }, [token]);

  async function assinar() {
    if (!nome.trim()) {
      setErroAssinar('Informe seu nome completo');
      return;
    }
    if (!selfie) {
      setErroAssinar('Envie uma foto (selfie) para confirmar a assinatura');
      return;
    }
    setErroAssinar(null);
    setAssinando(true);
    try {
      await assinarContratoPublico(token!, { nome, selfie });
      setAssinado(true);
    } catch (e: any) {
      setErroAssinar(e.message ?? 'Não foi possível registrar a assinatura');
    } finally {
      setAssinando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <FileSignature className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold">Assinatura de Contrato</h1>
          </div>

          {carregando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : erroCarregar ? (
            <p className="text-sm text-destructive">{erroCarregar}</p>
          ) : assinado ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
              <p className="font-medium">Contrato assinado com sucesso!</p>
              <p className="text-sm text-muted-foreground">Você já pode fechar esta página.</p>
            </div>
          ) : contrato.status !== 'pendente_assinatura' ? (
            <p className="text-sm text-muted-foreground">Este contrato não está mais aguardando assinatura (status atual: {contrato.status}).</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p>Cliente: {contrato.clienteNome}</p>
                {contrato.valorTotal != null && <p>Valor: {fmt(contrato.valorTotal)}</p>}
              </div>
              <div className="whitespace-pre-wrap rounded-md border p-4 text-sm">{contrato.conteudoRenderizado}</div>

              <div className="space-y-1.5">
                <Label>Seu nome completo *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Digite seu nome como assinatura" />
              </div>

              <div className="space-y-1.5">
                <Label>Selfie de confirmação *</Label>
                <Input type="file" accept="image/*" capture="user" onChange={(e) => setSelfie(e.target.files?.[0] ?? null)} />
                <p className="text-xs text-muted-foreground">Abre a câmera do celular, ou escolha uma foto no computador.</p>
              </div>

              {erroAssinar && <p className="text-sm text-destructive">{erroAssinar}</p>}

              <Button className="w-full" disabled={assinando} onClick={assinar}>
                {assinando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar assinatura
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
