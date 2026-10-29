import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui';

interface EventoInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Aparece só quando o navegador oferece instalação (evento `beforeinstallprompt`).
 * Em navegadores sem suporte (ex.: Safari/iOS) a aplicação continua funcionando no navegador.
 */
export function BotaoInstalar() {
  const [evento, setEvento] = useState<EventoInstalacao | null>(null);

  useEffect(() => {
    const aoOferecer = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalacao);
    };
    const aoInstalar = () => setEvento(null);
    window.addEventListener('beforeinstallprompt', aoOferecer);
    window.addEventListener('appinstalled', aoInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', aoOferecer);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  if (!evento) return null;
  return (
    <Button
      variante="secundario"
      icone="instalar"
      onClick={async () => {
        await evento.prompt();
        await evento.userChoice;
        setEvento(null);
      }}
    >
      Instalar aplicativo
    </Button>
  );
}
