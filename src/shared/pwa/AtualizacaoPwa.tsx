import { useRegisterSW } from 'virtual:pwa-register/react';
import { AvisoAtualizacaoView } from './AvisoAtualizacao';

/** Registra o service worker (modo `prompt`) e exibe o aviso de nova versão. */
export function AtualizacaoPwa() {
  const {
    needRefresh: [precisaAtualizar, setPrecisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <AvisoAtualizacaoView
      precisaAtualizar={precisaAtualizar}
      onAtualizar={() => void updateServiceWorker(true)}
      onDispensar={() => setPrecisaAtualizar(false)}
    />
  );
}
