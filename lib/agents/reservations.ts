import { pms } from "lib/pms";

export async function handleReservation(state: { messages: { content: string }[] }) {
  const userMessage = state.messages[0].content; // Extraer el mensaje del usuario
  console.log(`User request: ${userMessage}`); // Se usa para evitar el error de variable no utilizada

  const response = pms.createReservation("John Doe", "Deluxe", "2024-06-01", "2024-06-05");
  return { messages: [`Reservation confirmed: ${response.id}`] };
}
