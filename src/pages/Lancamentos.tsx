import { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FormLancamentoManual from '../components/formularios/FormLancamentoManual';
import TabelaLancamentos from '../components/lancamentos/TabelaLancamentos';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarPlanoContas } from '../servicos/planoContas';
import { listarHistoricos } from '../servicos/historicos';
import { showError } from '../utils/toast';

export default function Lancamentos() {
  const { empresaId } = useEmpresaAtiva();
  const [contas, setContas] = useState<any[]>([]);
  const [historicos, setHistoricos] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!empresaId) return;
    Promise.all([listarPlanoContas(empresaId), listarHistoricos(empresaId)])
      .then(([dadosContas, dadosHistoricos]) => {
        setContas(dadosContas);
        setHistoricos(dadosHistoricos);
      })
      .catch((erro) => showError(erro.message));
  }, [empresaId, refreshKey]);

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <h1 className="mb-6 flex items-center text-2xl font-bold md:text-3xl">
        <DollarSign className="mr-2 h-6 w-6" /> Lançamentos
      </h1>

      <Tabs defaultValue="novo" className="w-full">
        <TabsList>
          <TabsTrigger value="novo">Novo</TabsTrigger>
          <TabsTrigger value="manuais">Manuais</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value="novo" className="mt-4">
          <Card className="mx-auto max-w-3xl">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <DollarSign className="mr-2 h-5 w-5" /> Registrar partida dobrada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormLancamentoManual
                empresaId={empresaId}
                contas={contas}
                historicos={historicos}
                onSaveComplete={() => setRefreshKey((k) => k + 1)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manuais" className="mt-4">
          <TabelaLancamentos empresaId={empresaId} somenteOrigem="manual" refreshKey={refreshKey} />
        </TabsContent>

        <TabsContent value="todos" className="mt-4">
          <TabelaLancamentos empresaId={empresaId} refreshKey={refreshKey} />
        </TabsContent>
      </Tabs>
    </LayoutPrincipal>
  );
}
