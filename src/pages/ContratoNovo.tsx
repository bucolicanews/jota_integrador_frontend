import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarModelosContrato } from '../servicos/contratos';
import { showError } from '../utils/toast';

export default function ContratoNovo() {
  const { empresaId } = useEmpresaAtiva();
  const navigate = useNavigate();
  const [modelos, setModelos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!empresaId) return;
    setCarregando(true);
    listarModelosContrato(empresaId)
      .then(setModelos)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }, [empresaId]);

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <Link to="/contratos" className="mb-1 flex items-center text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar pra Contratos
      </Link>
      <h1 className="mb-6 text-2xl font-bold md:text-3xl">Escolha um modelo</h1>

      {carregando ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : modelos.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum modelo cadastrado ainda.{' '}
            <Link to="/contratos/modelos" className="text-primary hover:underline">
              Criar o primeiro modelo
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modelos.map((m) => (
            <Card key={m.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(`/contratos/preencher/${m.id}`)}>
              <CardContent className="flex items-start gap-3 p-4">
                <FileText className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{m.titulo}</p>
                  <p className="text-xs uppercase text-muted-foreground">{m.tipoConteudo}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </LayoutPrincipal>
  );
}
