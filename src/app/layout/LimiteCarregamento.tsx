import { Component, type ReactNode } from 'react';
import { Button } from '@/shared/ui';

/** Preserva uma saída utilizável se uma área ainda não carregada falhar na rede. */
export class LimiteCarregamento extends Component<{ children: ReactNode }, { falhou: boolean }> {
  override state = { falhou: false };

  static getDerivedStateFromError() {
    return { falhou: true };
  }

  override render() {
    if (!this.state.falhou) return this.props.children;
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-bold text-text">Não foi possível abrir esta área</h1>
        <p role="alert" className="my-4 text-text-secondary">
          Verifique sua conexão e recarregue a página para tentar novamente.
        </p>
        <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
      </main>
    );
  }
}
