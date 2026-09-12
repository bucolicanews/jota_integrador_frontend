import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Paperclip, Image as ImageIcon } from 'lucide-react';
import { obterProtocolo, obterUrlAnexo, obterUrlFotoEntrega } from '../../servicos/protocolos';
import { showError } from '../../utils/toast';

const formatarData = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—');

const ROTULO_STATUS: Record<string, { texto: string; variante: 'success' | 'warning' | 'secondary' | 'destructive' }> = {
  criado: { texto: 'Criado', variante: 'secondary' },
  impresso: { texto: 'Impresso', variante: 'warning' },
  transito: { texto: 'Trânsito', variante: 'warning' },
  entregue: { texto: 'Entregue', variante: 'success' },
  cancelado: { texto: 'Cancelado', variante: 'destructive' },
  problema: { texto: 'Problema', variante: 'destructive' },
};

interface DialogDetalheProtocoloProps {
  empresaId: string;
  protocoloId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DialogDetalheProtocolo({ empresaId, protocoloId, open, onOpenChange }: DialogDetalheProtocoloProps) {
  const [protocolo, setProtocolo] = useState<any | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [abrindoAnexo, setAbrindoAnexo] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !protocoloId) return;
    setCarregando(true);
    obterProtocolo(empresaId, protocoloId)
      .then(setProtocolo)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }, [open, protocoloId, empresaId]);

  async function abrirAnexo(anexoId: string) {
    if (!protocolo) return;
    setAbrindoAnexo(anexoId);
    try {
      const { url } = await obterUrlAnexo(empresaId, protocolo.id, anexoId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível abrir o anexo');
    } finally {
      setAbrindoAnexo(null);
    }
  }

  async function abrirFotoEntrega() {
    if (!protocolo) return;
    setAbrindoAnexo('foto-entrega');
    try {
      const { url } = await obterUrlFotoEntrega(empresaId, protocolo.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível abrir a foto');
    } finally {
      setAbrindoAnexo(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md md:max-w-[70%]">
        <DialogHeader>
          <DialogTitle>Detalhes do protocolo</DialogTitle>
          {protocolo && <DialogDescription className="font-mono">{protocolo.numeroProtocolo}</DialogDescription>}
        </DialogHeader>

        {carregando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : protocolo ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={ROTULO_STATUS[protocolo.status].variante}>{ROTULO_STATUS[protocolo.status].texto}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p>{formatarData(protocolo.dataCriacao)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Impresso em</p>
                <p>{formatarData(protocolo.dataImpressao)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recebido em</p>
                <p>{formatarData(protocolo.dataRecebimento)}</p>
              </div>
              {protocolo.nomeRespRecebimento && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Responsável pelo recebimento</p>
                  <p>{protocolo.nomeRespRecebimento}</p>
                </div>
              )}
            </div>

            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground">Título</p>
              <p className="font-medium">{protocolo.titulo}</p>
            </div>
            {protocolo.descricao && (
              <div>
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p className="whitespace-pre-wrap text-sm">{protocolo.descricao}</p>
              </div>
            )}
            {protocolo.linkTarefa && (
              <div>
                <p className="text-xs text-muted-foreground">Link da tarefa</p>
                <a href={protocolo.linkTarefa} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-primary underline">
                  {protocolo.linkTarefa}
                </a>
              </div>
            )}

            {protocolo.observacaoStatus && (
              <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
                <p className="text-xs font-semibold text-destructive">Observação ({ROTULO_STATUS[protocolo.status].texto})</p>
                <p className="text-sm">{protocolo.observacaoStatus}</p>
              </div>
            )}

            {protocolo.anexos.length > 0 && (
              <div className="border-t pt-3">
                <p className="mb-1 text-xs text-muted-foreground">Anexos</p>
                <div className="space-y-1">
                  {protocolo.anexos.map((anexo: any) => (
                    <Button
                      key={anexo.id}
                      variant="ghost"
                      size="sm"
                      className="h-8 justify-start gap-2 px-2 text-xs"
                      onClick={() => abrirAnexo(anexo.id)}
                      disabled={abrindoAnexo === anexo.id}
                    >
                      {abrindoAnexo === anexo.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                      {anexo.nomeArquivo}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {protocolo.imgProtocoloRef && (
              <div className="border-t pt-3">
                <Button variant="outline" size="sm" onClick={abrirFotoEntrega} disabled={abrindoAnexo === 'foto-entrega'}>
                  {abrindoAnexo === 'foto-entrega' ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="mr-2 h-3.5 w-3.5" />}
                  Ver foto do protocolo assinado
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
