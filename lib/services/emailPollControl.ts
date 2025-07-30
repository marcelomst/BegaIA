// Path: /root/begasist/lib/services/emailPollControl.ts
// Control de ejecución del fetch de emails. Usado para habilitar o deshabilitar el polling por hotel.
// Ahora delega el heartbeat al módulo genérico.

import { startChannelHeartbeat, stopChannelHeartbeat } from "@/lib/services/heartbeat";

const pollingStates: Record<string, boolean> = {};

/**
 * Retorna si el polling está habilitado para el hotel dado.
 */
export function isEmailPollingEnabled(hotelId: string): boolean {
  return pollingStates[hotelId] ?? false;
}

/**
 * Habilita el polling para un hotel específico y arranca el heartbeat.
 */
export function enableEmailPolling(hotelId: string) {
  pollingStates[hotelId] = true;
  console.log(`📡 Polling de email habilitado para hotel ${hotelId}`);
  startChannelHeartbeat("email", hotelId);
}

/**
 * Deshabilita el polling para un hotel específico y detiene el heartbeat.
 */
export function disableEmailPolling(hotelId: string) {
  pollingStates[hotelId] = false;
  console.log(`📡 Polling de email deshabilitado para hotel ${hotelId}`);
  stopChannelHeartbeat("email", hotelId);
}

/**
 * Alterna el estado de polling para un hotel.
 */
export function toggleEmailPolling(hotelId: string) {
  const newState = !pollingStates[hotelId];
  pollingStates[hotelId] = newState;
  console.log(`📡 Polling de email ${newState ? "habilitado" : "deshabilitado"} para hotel ${hotelId}`);
  newState ? startChannelHeartbeat("email", hotelId) : stopChannelHeartbeat("email", hotelId);
}
