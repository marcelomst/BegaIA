// /root/begasist/lib/services/channelManagerPollingState.ts
let state: Record<string, boolean> = {};
export async function getChannelManagerPollingState(hotelId: string): Promise<boolean> {
  return state[hotelId] ?? true;
}
export async function disableChannelManagerPolling(hotelId: string): Promise<void> {
  state[hotelId] = false;
}
