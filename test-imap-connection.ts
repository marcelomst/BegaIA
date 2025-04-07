import tls from "tls";

const options = {
  host: "imap.gmail.com",
  port: 993,
  servername: "imap.gmail.com", // necesario para SNI
  rejectUnauthorized: false,    // solo para testeo
};

console.log("📡 Iniciando conexión TLS a IMAP...");

const socket = tls.connect(options, () => {
  if (socket.authorized) {
    console.log("✅ Conexión TLS establecida correctamente con IMAP.");
  } else {
    console.warn("⚠️ Conexión establecida, pero no autorizada:", socket.authorizationError);
  }

  socket.write("a1 CAPABILITY\r\n");
});

socket.setEncoding("utf8");

socket.on("data", (data) => {
  console.log("📨 Respuesta del servidor:", data);
  if (data.includes("OK")) {
    console.log("✅ IMAP respondió correctamente.");
    socket.end();
  }
});

socket.on("error", (err) => {
  console.error("❌ Error en la conexión TLS:", err);
});

socket.on("end", () => {
  console.log("🔌 Conexión finalizada.");
});
