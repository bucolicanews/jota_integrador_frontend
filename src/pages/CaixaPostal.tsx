import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { Inbox, Loader2, RefreshCw } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarMensagensCaixaPostal, marcarMensagemComoLida, obterDetalheMensagem, sincronizarCaixaPostal } from '../servicos/caixaPostal';
import { showError } from '../utils/toast';

const formatarData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

export default function CaixaPostal() {
  const { empresaId } = useEmpresaAtiva();
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [mensagemSelecionada, setMensagemSelecionada] = useState<any | null>(null);
  const [conteudo, setConteudo] = useState<string | null>(null);
  const [carregandoConteudo, setCarregandoConteudo] = useState(false);

  function carregar() {
    if (!empresaId) return;
    setCarregando(true);
    listarMensagensCaixaPostal(empresaId)
      .then(setMensagens)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId]);

  function sincronizar() {
    if (!empresaId) return;
    setSincronizando(true);
    sincronizarCaixaPostal(empresaId)
      .then(() => carregar())
      .catch((erro) => showError(erro.message))
      .finally(() => setSincronizando(false));
  }

  async function abrirMensagem(mensagem: any) {
    setMensagemSelecionada(mensagem);
    setConteudo(null);
    setCarregandoConteudo(true);
    try {
      const resposta = await obterDetalheMensagem(empresaId, mensagem.id);
      setConteudo(resposta.conteudo);
      if (mensagem.status === 'nao_lida') {
        await marcarMensagemComoLida(empresaId, mensagem.id);
        setMensagens((atual) => atual.map((m) => (m.id === mensagem.id ? { ...m, status: 'lida' } : m)));
      }
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível abrir a mensagem');
    } finally {
      setCarregandoConteudo(false);
    }
  }

  if (!empresaId) return null;

  const naoLidas = mensagens.filter((m) => m.status === 'nao_lida').length;
  // Conteúdo vem do SERPRO (Receita Federal) -- sempre sanitizado com DOMPurify antes de
  // renderizar, nunca HTML bruto direto no DOM (mesmo padrão já usado na tela legada).
  const conteudoSeguro = conteudo ? DOMPurify.sanitize(conteudo) : null;

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <Inbox className="mr-2 h-6 w-6" /> Caixa Postal
          {naoLidas > 0 && <Badge variant="info" className="ml-3">{naoLidas} não lida{naoLidas > 1 ? 's' : ''}</Badge>}
        </h1>
        <Button onClick={sincronizar} disabled={sincronizando} className="w-full sm:w-auto">
          <RefreshCw className={`mr-2 h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`} /> Sincronizar com a Receita Federal
        </Button>
      </div>

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
                    <TableHead>Assunto</TableHead>
                    <TableHead>Órgão</TableHead>
                    <TableHead className="w-[110px]">Recebida em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mensagens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        Nenhuma mensagem ainda. Clique em "Sincronizar com a Receita Federal".
                      </TableCell>
                    </TableRow>
                  ) : (
                    mensagens.map((mensagem) => (
                      <TableRow key={mensagem.id} className="cursor-pointer" onClick={() => abrirMensagem(mensagem)}>
                        <TableCell className={mensagem.status === 'nao_lida' ? 'font-semibold' : 'font-medium'}>
                          {mensagem.status === 'nao_lida' && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" />}
                          {mensagem.assunto}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{mensagem.orgao}</TableCell>
                        <TableCell className="text-xs">{formatarData(mensagem.dataRecebimento)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={mensagemSelecionada !== null} onOpenChange={(open) => !open && setMensagemSelecionada(null)}>
        <DialogContent className="max-w-md md:max-w-[85%]">
          <DialogHeader>
            <p className="text-xs font-medium uppercase text-muted-foreground">{mensagemSelecionada?.orgao}</p>
            <DialogTitle>{mensagemSelecionada?.assunto}</DialogTitle>
            <p className="text-xs text-muted-foreground">{mensagemSelecionada && formatarData(mensagemSelecionada.dataRecebimento)}</p>
          </DialogHeader>
          {carregandoConteudo ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            conteudoSeguro && (
              <div className="max-h-[60vh] space-y-2 overflow-y-auto text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: conteudoSeguro }} />
            )
          )}
        </DialogContent>
      </Dialog>
    </LayoutPrincipal>
  );
}
