export async function classifyQuery(question: string): Promise<string> {
  const lowerCaseQ = question.toLowerCase();
  let category = "other"; // Categoría por defecto

  if (
    lowerCaseQ.includes("reservar") ||
    lowerCaseQ.includes("reserva") ||
    lowerCaseQ.includes("quiero reservar") ||
    lowerCaseQ.includes("hacer una reserva")
  ) {
    category = "reservation";
  } else if (
    lowerCaseQ.includes("habitacion") ||
    lowerCaseQ.includes("cuarto") ||
    lowerCaseQ.includes("vista al mar") ||
    lowerCaseQ.includes("frente al mar") ||
    lowerCaseQ.includes("tipo de habitacion") ||
    lowerCaseQ.includes("comodidades")
  ) {
    category = "room_info";
  } else if (
    lowerCaseQ.includes("servicio") ||
    lowerCaseQ.includes("spa") ||
    lowerCaseQ.includes("gimnasio") ||
    lowerCaseQ.includes("restaurante")
  ) {
    category = "services";
  } else if (
    lowerCaseQ.includes("factura") ||
    lowerCaseQ.includes("pago") ||
    lowerCaseQ.includes("cobro") ||
    lowerCaseQ.includes("precio")
  ) {
    category = "billing";
  } else if (
    lowerCaseQ.includes("soporte") ||
    lowerCaseQ.includes("problema") ||
    lowerCaseQ.includes("ayuda")
  ) {
    category = "support";
  }

  console.log(`✅ Consulta clasificada como: ${category}`); // 🔍 LOG ÚTIL PARA DEPURACIÓN
  return category;
}
