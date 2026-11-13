import { useEffect, useState } from 'react';
import { FileCheck2, Loader2, RefreshCw } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { obterUrlCcmei } from '../servicos/ccmei';
import { obterEmpresa } from '../servicos/empresas';
import { executarComAvisoDeCredito } from '../servicos/creditos';
import { showError } from '../utils/toast';

/**
 * CCMEI cacheado -- "Baixar" serve o PDF já salvo (sem gastar crédito, mesmo padrão do
 * "Relatório"/extrato do DAS em Das.tsx). Só "Atualizar" força nova consulta ao SERPRO
 * e gasta crédito -- CCMEI não expira sozinho, pedido explícito do usuário 2026-11-13.
 */
export default function Ccmei() {
  const { empresaId, ehContador, ehPlataforma } = useEmpresaAtiva();
  const podeVerCredito = ehContador || ehPlataforma;
  const [baixando, setBaixando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [mensagemCredito, setMensagemCredito] = useState<string | null>(null);
  // CCMEI é exclusivo de MEI (diferente do DAS, que também vale pra Simples Nacional) --
  // checagem via GET /empresas/:id (grátis, sem custo de SERPRO), nunca via
  // obterUrlCcmei (que gastaria crédito só pra descobrir o regime).
  const [naoAplicavel, setNaoAplicavel] = useState(false);
  const [carregandoRegime, setCarregandoRegime] = useState(true);

  useEffect(() => {
    if (!empresaId) return;
    setCarregandoRegime(true);
    obterEmpresa(empresaId)
      .then((empresa: any) => setNaoAplicavel(empresa.regimeTributario !== 'mei'))
      .catch(() => setNaoAplicavel(false))
      .finally(() => setCarregandoRegime(false));
  }, [empresaId]);

  async function baixar() {
    if (!empresaId) return;
    setBaixando(true);
    try {
      const { url } = await obterUrlCcmei(empresaId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível abrir o CCMEI');
    } finally {
      setBaixando(false);
    }
  }

  /** Abre a aba ANTES do await -- mesma regra de gerarSegundaVia em Das.tsx, senão o Chrome bloqueia o popup. */
  async function atualizar() {
    if (!empresaId) return;
    const aba = window.open('', '_blank');
    if (aba) aba.opener = null;
    setAtualizando(true);
    try {
      const { resultado, gasto, saldo } = await executarComAvisoDeCredito(empresaId, () => obterUrlCcmei(empresaId, true));
      if (aba) aba.location.href = resultado.url;
      else window.open(resultado.url, '_blank', 'noopener,noreferrer');
      if (podeVerCredito) {
        setMensagemCredito(gasto > 0 ? `Atualização gastou ${gasto} crédito(s). Saldo atual: ${saldo}.` : `Não gastou crédito. Saldo atual: ${saldo}.`);
      }
    } catch (erro: any) {
      aba?.close();
      showError(erro.message ?? 'Não foi possível atualizar o CCMEI');
    } finally {
      setAtualizando(false);
    }
  }

  if (!empresaId) {
    return (
      <LayoutPrincipal>
        <p className="text-sm text-muted-foreground">Selecione uma empresa.</p>
      </LayoutPrincipal>
    );
  }

  return (
    <LayoutPrincipal>
      <h1 className="mb-4 flex items-center text-2xl font-bold md:text-3xl">
        <FileCheck2 className="mr-2 h-6 w-6" /> CCMEI
      </h1>
      <Card className="max-w-md">
        <CardContent className="space-y-3 p-6">
          {carregandoRegime ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : naoAplicavel ? (
            <p className="text-sm text-muted-foreground">Este módulo é aplicável apenas a empresas MEI.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Certificado da Condição de Microempreendedor Individual. Depois da primeira consulta, o PDF fica salvo -- baixar de novo não gasta crédito.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={baixar} disabled={baixando}>
                  {baixando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Baixar CCMEI
                </Button>
                <Button variant="outline" onClick={atualizar} disabled={atualizando}>
                  {atualizando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Atualizar
                </Button>
              </div>
              {mensagemCredito && <p className="text-xs text-muted-foreground">{mensagemCredito}</p>}
            </>
          )}
        </CardContent>
      </Card>
    </LayoutPrincipal>
  );
}
