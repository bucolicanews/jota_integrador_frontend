import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ProtocoloAcoesMenu from './ProtocoloAcoesMenu';

const ROTULO_STATUS: Record<string, { texto: string; variante: 'success' | 'warning' | 'secondary' | 'destructive' }> = {
  criado: { texto: 'Criado', variante: 'secondary' },
  impresso: { texto: 'Impresso', variante: 'warning' },
  transito: { texto: 'Trânsito', variante: 'warning' },
  entregue: { texto: 'Entregue', variante: 'success' },
  cancelado: { texto: 'Cancelado', variante: 'destructive' },
  problema: { texto: 'Problema', variante: 'destructive' },
};

const formatarData = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

interface Cliente {
  id: string;
  nome: string;
  razaoSocial: string | null;
}

interface Protocolo {
  id: string;
  numeroProtocolo: string;
  titulo: string;
  clienteId: string;
  status: 'criado' | 'impresso' | 'transito' | 'entregue' | 'cancelado' | 'problema';
  dataCriacao: string;
}

interface ProtocoloCardProps {
  protocolo: Protocolo;
  clientes: Cliente[];
  onVerDetalhes: () => void;
  onEditar: () => void;
  onImprimir: () => void;
  onAvancar: () => void;
  onDarBaixa: () => void;
  onCancelar: () => void;
  onProblema: () => void;
  onExcluir: () => void;
}

export default function ProtocoloCard({ protocolo, clientes, ...acoes }: ProtocoloCardProps) {
  const cliente = clientes.find((c) => c.id === protocolo.clienteId);
  const clienteDisplay = cliente ? cliente.razaoSocial || cliente.nome : '—';

  return (
    <Card className={cn('transition-shadow hover:shadow-md', protocolo.status === 'entregue' && 'border-green-500/30', (protocolo.status === 'cancelado' || protocolo.status === 'problema') && 'opacity-70')}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-xs font-semibold">{protocolo.numeroProtocolo}</p>
            <Badge variant={ROTULO_STATUS[protocolo.status].variante} className="mt-1">
              {ROTULO_STATUS[protocolo.status].texto}
            </Badge>
          </div>
          <ProtocoloAcoesMenu status={protocolo.status} {...acoes} />
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Cliente</p>
          <p className="font-medium">{clienteDisplay}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Título</p>
          <p className="line-clamp-2 text-sm">{protocolo.titulo}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Criado em</p>
          <p className="text-xs">{formatarData(protocolo.dataCriacao)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
