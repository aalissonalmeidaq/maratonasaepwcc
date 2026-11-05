import { appInstalado, navegadorIos } from './instalacao';
export function OrientacaoInstalacao() {
  if (appInstalado() || !navegadorIos()) return null;
  return (
    <p className="max-w-prose text-sm">
      Para instalar: toque em Compartilhar e depois em Adicionar à Tela de Início.
    </p>
  );
}
