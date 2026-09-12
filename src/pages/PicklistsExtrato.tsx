import { ListChecks } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ListaPicklistExtrato from '../components/conciliacao/ListaPicklistExtrato';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarDescricoesExtrato, criarDescricaoExtrato, atualizarDescricaoExtrato, excluirDescricaoExtrato } from '../servicos/descricoesExtrato';
import {
  listarIdentificadoresExtrato,
  criarIdentificadorExtrato,
  atualizarIdentificadorExtrato,
  excluirIdentificadorExtrato,
} from '../servicos/identificadoresExtrato';

export default function PicklistsExtrato() {
  const { empresaId } = useEmpresaAtiva();
  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <ListChecks className="mr-2 h-6 w-6" /> Sugestões de Extrato
        </h1>
        <p className="text-sm text-muted-foreground">Descrições e identificações sugeridas no formulário de Lançamento de Extrato Manual.</p>
      </div>

      <Tabs defaultValue="descricoes" className="w-full">
        <TabsList>
          <TabsTrigger value="descricoes">Descrições</TabsTrigger>
          <TabsTrigger value="identificadores">Identificadores</TabsTrigger>
        </TabsList>
        <TabsContent value="descricoes" className="mt-4">
          <ListaPicklistExtrato
            empresaId={empresaId}
            placeholder="Ex: Recebimento PIX Cliente X"
            listar={listarDescricoesExtrato}
            criar={criarDescricaoExtrato}
            atualizar={atualizarDescricaoExtrato}
            excluir={excluirDescricaoExtrato}
          />
        </TabsContent>
        <TabsContent value="identificadores" className="mt-4">
          <ListaPicklistExtrato
            empresaId={empresaId}
            placeholder="Ex: NF 123"
            listar={listarIdentificadoresExtrato}
            criar={criarIdentificadorExtrato}
            atualizar={atualizarIdentificadorExtrato}
            excluir={excluirIdentificadorExtrato}
          />
        </TabsContent>
      </Tabs>
    </LayoutPrincipal>
  );
}
