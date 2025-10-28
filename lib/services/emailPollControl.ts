// Path: /root/begasist/lib/services/emailPollControl.ts
// Control de ejecución del fetch de emails. Usado para habilitar o deshabilitar el polling por hotel.
// Ahora delega el heartbeat al módulo genérico.

import { startChannelHeartbeat, stopChannelHeartbeat } from "@/lib/services/heartbeat";
import { setEmailPollingState } from "@/lib/services/emailPollingState";

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
  // Persistir en Redis para que getEmailPollingState refleje el cambio
  setEmailPollingState(hotelId, true).catch(err => console.warn('[email] No se pudo persistir estado enable polling:', err));
  startChannelHeartbeat("email", hotelId);
}

/**
 * Deshabilita el polling para un hotel específico y detiene el heartbeat.
 */
export function disableEmailPolling(hotelId: string) {
  pollingStates[hotelId] = false;
  console.log(`📡 Polling de email deshabilitado para hotel ${hotelId}`);
  // Persistir en Redis para evitar que siga retornando true
  setEmailPollingState(hotelId, false).catch(err => console.warn('[email] No se pudo persistir estado disable polling:', err));
  stopChannelHeartbeat("email", hotelId);
}

/**
 * Alterna el estado de polling para un hotel.
 */
export function toggleEmailPolling(hotelId: string) {
  const newState = !pollingStates[hotelId];
  pollingStates[hotelId] = newState;
  console.log(`📡 Polling de email ${newState ? "habilitado" : "deshabilitado"} para hotel ${hotelId}`);
  setEmailPollingState(hotelId, newState).catch(err => console.warn('[email] No se pudo persistir estado toggle polling:', err));
  newState ? startChannelHeartbeat("email", hotelId) : stopChannelHeartbeat("email", hotelId);
}
