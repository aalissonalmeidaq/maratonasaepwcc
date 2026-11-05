export function appInstalado() {
  return (
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone) ||
    Boolean(window.matchMedia?.('(display-mode: standalone)').matches)
  );
}
export function navegadorIos() {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}
