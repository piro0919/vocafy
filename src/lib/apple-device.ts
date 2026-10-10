/** iOS / iPadOS か。iPad の Safari は Mac を名乗るので、触れる Mac は iPad とみなす */
export function isAppleDevice(): boolean {
  const agent = window.navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(agent) ||
    (agent.includes('macintosh') && window.navigator.maxTouchPoints > 1)
  );
}
