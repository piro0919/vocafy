/** iPhone・iPad でホーム画面から開いているか。navigator.standalone は iOS・iPadOS の Safari だけにある */
export function isIosStandalone(): boolean {
  return navigator.standalone === true;
}

/** ホーム画面に置いたアプリとして開いているか（iPhone・iPad は navigator.standalone、ほかは display-mode） */
export function isStandaloneApp(): boolean {
  return matchMedia('(display-mode: standalone)').matches || isIosStandalone();
}
