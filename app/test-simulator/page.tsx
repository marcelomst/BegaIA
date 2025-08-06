// Path: /root/begasist/app/test-simulator/page.tsx
"use client";
import React, { useState } from "react";

export default function TestSimulator() {
  // Si quieres, extrae HOTEL_ID de env o hardcódialo aquí:
  const HOTEL_ID = "hotel999";

  const [cmJson, setCmJson] = useState(`{
  "eventId": "evt-123",
  "eventType": "guest_message",
  "channel": "channelManager",
  "reservationId": "res-456",
  "guestId": "guest-789",
  "payload": {
    "messageId": "msg-1",
    "conversationId": null,
    "reservationId": "res-456",
    "guestId": "guest-789",
    "channel": "channelManager",
    "source": "cm",
    "direction": "incoming",
    "timestamp": "${new Date().toISOString()}",
    "content": "a que hora es el check in?",
    "status": "pending"
  },
  "receivedAt": "${new Date().toISOString()}",
  "processedByHA": false
}`);
  const [otaJson, setOtaJson] = useState(`{
  "messageId": "msg-2",
  "conversationId": "conv-1",
  "reservationId": "res-456",
  "guestId": "guest-789",
  "channel": "whatsapp",
  "source": "guest_comment",
  "direction": "incoming",
  "timestamp": "${new Date().toISOString()}",
  "content": "¿Hay desayuno incluido?",
  "status": "pending"
}`);
  const [webJson, setWebJson] = useState(`{
  "reservationId": "res-456",
  "hotelId": "${HOTEL_ID}",
  "channel": "web",
  "guest": {
    "guestId": "guest-789",
    "hotelId": "${HOTEL_ID}",
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com",
    "phone": "+34123456789",
    "createdAt": "${new Date().toISOString()}"
  },
  "checkIn": "2025-08-10",
  "checkOut": "2025-08-12",
  "roomType": "double",
  "ratePlan": "standard",
  "status": "new",
  "bookingTimestamp": "${new Date().toISOString()}",
  "guestComment": "Necesito habitación tranquila"
}`);
  const [response, setResponse] = useState<string>("");

  async function simulate(path: string, body: string) {
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await res.json();
      setResponse(`${path} → ${JSON.stringify(data)}`);
    } catch (err) {
      setResponse(`Error: ${String(err)}`);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🛠 Test Simulator</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ---------------- CM ---------------- */}
        <section>
          <h2 className="font-semibold">Channel Manager</h2>
          <textarea
            className="w-full h-48 border p-2"
            value={cmJson}
            onChange={(e) => setCmJson(e.target.value)}
          />
          <button
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
            onClick={() =>
              simulate(
                `/api/simulate/channel-manager?hotelId=${HOTEL_ID}&immediate=0`,
                cmJson
              )
            }
          >
            Enviar CM
          </button>
        </section>

        {/* ---------------- OTA ---------------- */}
        <section>
          <h2 className="font-semibold">OTA Message</h2>
          <textarea
            className="w-full h-48 border p-2"
            value={otaJson}
            onChange={(e) => setOtaJson(e.target.value)}
          />
          <button
            className="mt-2 px-4 py-2 bg-green-600 text-white rounded"
            onClick={() =>
              simulate(
                `/api/simulate/ota-message?hotelId=${HOTEL_ID}`,
                otaJson
              )
            }
          >
            Enviar OTA
          </button>
        </section>

        {/* ------------ WEB Reservation ------------ */}
        <section>
          <h2 className="font-semibold">Web Reservation</h2>
          <textarea
            className="w-full h-48 border p-2"
            value={webJson}
            onChange={(e) => setWebJson(e.target.value)}
          />
          <button
            className="mt-2 px-4 py-2 bg-purple-600 text-white rounded"
            onClick={() =>
              simulate(
                `/api/simulate/web-reservation?hotelId=${HOTEL_ID}`,
                webJson
              )
            }
          >
            Enviar Reserva
          </button>
        </section>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold">Respuesta</h3>
        <pre className="bg-gray-100 p-3 rounded">{response}</pre>
      </div>
    </div>
  );
}
