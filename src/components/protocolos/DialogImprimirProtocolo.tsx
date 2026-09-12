import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { avancarStatusProtocolo } from '../../servicos/protocolos';
import { showError } from '../../utils/toast';

interface Cliente {
  id: string;
  nome: string;
  razaoSocial: string | null;
}

interface DialogImprimirProtocoloProps {
  empresaId: string;
  protocolo: { id: string; numeroProtocolo: string; titulo: string; descricao: string | null; clienteId: string; status: string; dataCriacao: string } | null;
  clientes: Cliente[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImpresso: () => void;
}

/** 100% client-side (mesma técnica do jotaCaixa) -- gera o HTML de 2 vias e chama window.print() numa janela nova. Se o protocolo ainda estiver "criado", avança pra "impresso" ao confirmar. */
export default function DialogImprimirProtocolo({ empresaId, protocolo, clientes, open, onOpenChange, onImpresso }: DialogImprimirProtocoloProps) {
  if (!protocolo) return null;

  const cliente = clientes.find((c) => c.id === protocolo.clienteId);
  const clienteDisplay = cliente ? cliente.razaoSocial || cliente.nome : 'N/A';

  async function confirmarImpressao() {
    const dataCriacaoFormatada = new Date(protocolo!.dataCriacao).toLocaleString('pt-BR');
    const dataImpressao = new Date().toLocaleDateString('pt-BR');
    const descricaoHtml = protocolo!.descricao
      ? `<tr><td colspan="2" style="padding:2mm;border-bottom:1px solid #000;font-size:9pt"><strong>Observação:</strong><div style="white-space:pre-wrap;word-wrap:break-word;margin-top:1mm">${protocolo!.descricao}</div></td></tr>`
      : '';

    const via = (numero: number) => `
      <table style="width:100%;border-collapse:collapse;border:2px solid #000;margin-bottom:3mm">
        <tr><td colspan="2" style="text-align:center;border-bottom:2px solid #000;padding:2mm;background:#f0f0f0">
          <div style="font-size:14pt;font-weight:bold">PROTOCOLO DE ENTREGA</div>
          <div style="font-size:10pt;font-weight:bold">${numero}ª VIA - ${numero === 1 ? 'EMPRESA' : 'CLIENTE'}</div>
        </td></tr>
        <tr><td colspan="2" style="text-align:center;padding:2mm;border-bottom:1px solid #000;background:#e8e8e8">
          <div style="font-size:8pt">Nº PROTOCOLO</div>
          <div style="font-size:14pt;font-weight:bold">${protocolo!.numeroProtocolo}</div>
        </td></tr>
        <tr>
          <td style="width:50%;padding:2mm;border-bottom:1px solid #000;border-right:1px solid #000;font-size:9pt"><strong>Cliente:</strong><br/>${clienteDisplay}</td>
          <td style="width:50%;padding:2mm;border-bottom:1px solid #000;font-size:9pt"><strong>Data Criação:</strong><br/>${dataCriacaoFormatada}</td>
        </tr>
        <tr><td colspan="2" style="padding:2mm;border-bottom:1px solid #000;font-size:9pt"><strong>Título:</strong> ${protocolo!.titulo}</td></tr>
        ${descricaoHtml}
        <tr>
          <td style="width:50%;padding:2mm;border-right:1px solid #000;font-size:8pt;text-align:center">
            <strong>ENTREGUE POR</strong><br/>______________________<br/><span style="font-size:7pt;color:#666">Data: ${dataImpressao}</span>
          </td>
          <td style="width:50%;padding:2mm;font-size:8pt;text-align:center">
            <strong>RECEBIDO POR</strong><br/>______________________<br/><span style="font-size:7pt;color:#666">Data: ___/___/____</span>
          </td>
        </tr>
      </table>`;

    const htmlContent = `<!DOCTYPE html><html><head><title>Protocolo ${protocolo!.numeroProtocolo}</title>
      <style>@page { size: A4 portrait; margin: 10mm; } body { font-family: Arial, sans-serif; margin: 0; padding: 10mm; }</style>
      </head><body>${via(1)}<div style="border-bottom:1px dashed #999;margin:2mm 0"></div>${via(2)}</body></html>`;

    const janela = window.open('', '_blank', 'width=800,height=600');
    if (!janela) {
      showError('Popup bloqueado! Permita popups para imprimir.');
      return;
    }
    janela.document.write(htmlContent);
    janela.document.close();
    setTimeout(() => {
      try {
        janela.focus();
        janela.print();
      } catch {
        // impressão cancelada pelo usuário -- não é erro
      }
    }, 500);

    if (protocolo!.status === 'criado') {
      try {
        await avancarStatusProtocolo(empresaId, protocolo!.id, 'impresso');
      } catch (erro: any) {
        showError(erro.message ?? 'Impressão gerada, mas falhou ao marcar como Impresso');
      }
    }

    onOpenChange(false);
    onImpresso();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Imprimir protocolo — {protocolo.numeroProtocolo}</DialogTitle>
          <DialogDescription>Será impresso em duas vias: uma para a empresa e outra para o cliente.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmarImpressao}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir e confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
