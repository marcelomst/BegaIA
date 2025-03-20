import "openai/shims/node"; // Para arreglar el fetch de OpenAI
import request from "supertest";
import { createServer } from "http";
import { POST } from "../app/api/chat/route.ts";
import { test, expect, beforeAll, afterAll } from "vitest";

// 📌 Servidor de pruebas
let server: any;

beforeAll(() => {
  server = createServer(async (req, res) => {
    try {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", async () => {
        try {
          const body = JSON.parse(data);

          // ✅ Aseguramos que la URL sea absoluta
          const fullUrl = new URL(req.url ?? "/api/chat", "http://localhost:3001");

          const nextReq = new Request(fullUrl.toString(), {
            method: req.method ?? "POST",
            headers: req.headers as HeadersInit,
            body: JSON.stringify(body),
          });

          // Ejecutar la función POST de Next.js
          const response = await POST(nextReq);
          const responseData = await response.json();

          // Responder con el contenido de Next.js
          res.writeHead(response.status, { "Content-Type": "application/json" });
          res.end(JSON.stringify(responseData));
        } catch (error) {
          console.error("❌ Error al parsear JSON:", error);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Solicitud inválida" }));
        }
      });
    } catch (error) {
      console.error("❌ Error en el servidor de pruebas:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Error interno en el servidor" }));
    }
  });

  server.listen(3001, () => {
    console.log("🚀 Servidor de pruebas en ejecución en el puerto 3001");
  });
});

afterAll(() => {
  server.close();
  console.log("🛑 Servidor de pruebas detenido.");
});

// 🔥 Test para validar la API de chat
test("Debe responder con un mensaje válido del bot", async () => {
  const response = await request(server)
    .post("/api/chat")
    .send({ query: "¿Qué tipos de habitaciones tienen?" });

  console.log("📌 Respuesta del servidor:", response.body);

  expect(response.status).toBe(200);
  expect(response.body).toBeDefined();
  expect(response.body.response).toBeDefined();
  expect(response.body.response.length).toBeGreaterThan(0);
});
