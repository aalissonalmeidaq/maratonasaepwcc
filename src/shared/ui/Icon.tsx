import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Download,
  FileWarning,
  Gift,
  Home,
  Info,
  LogOut,
  Megaphone,
  Menu,
  RefreshCw,
  Send,
  ShieldAlert,
  Target,
  Trophy,
  User,
  Users,
  WifiOff,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

/**
 * Ponto único de iconografia. PROVISÓRIO: usa lucide-react até que os ícones próprios do
 * projeto sejam entregues como SVGs individuais (Design System §8). Para trocar, substitua o
 * mapeamento abaixo; as telas usam apenas os nomes semânticos.
 */
const ICONES = {
  inicio: Home,
  dupla: Users,
  turmas: Building2,
  encontros: CalendarDays,
  desafio: Target,
  pontuacao: BarChart3,
  ranking: Trophy,
  regulamento: BookOpen,
  comunicados: Megaphone,
  presenca: ClipboardCheck,
  avaliacao: ClipboardList,
  ocorrencias: ShieldAlert,
  relatorios: FileWarning,
  premiacao: Gift,
  conquista: Award,
  usuario: User,
  sair: LogOut,
  menu: Menu,
  fechar: X,
  offline: WifiOff,
  atualizar: RefreshCw,
  instalar: Download,
  enviar: Send,
  relogio: Clock,
  alerta: AlertTriangle,
  sucesso: CheckCircle2,
  erro: XCircle,
  info: Info,
} satisfies Record<string, LucideIcon>;

export type NomeIcone = keyof typeof ICONES;

const TAMANHOS = { sm: 16, md: 20, lg: 24, xl: 32 } as const;

interface IconProps {
  nome: NomeIcone;
  tamanho?: keyof typeof TAMANHOS;
  /** Quando informado, o ícone é anunciado; caso contrário é decorativo. */
  rotulo?: string;
  className?: string;
}

export function Icon({ nome, tamanho = 'md', rotulo, className }: IconProps) {
  const Componente = ICONES[nome];
  return (
    <Componente
      size={TAMANHOS[tamanho]}
      strokeWidth={2}
      className={className}
      {...(rotulo ? { role: 'img', 'aria-label': rotulo } : { 'aria-hidden': true })}
      focusable="false"
    />
  );
}
