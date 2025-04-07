// test-imap-simple.ts
import imaps from "imap-simple";
import dotenv from "dotenv";

dotenv.config();

async function testImapSimpleConnection() {
  console.log("📡 [imap-simple] Iniciando conexión...");

  const config = {
    imap: {
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASS,
      host: process.env.IMAP_HOST,
      port: Number(process.env.IMAP_PORT) || 993,
      tls: true,
      authTimeout: 15000,
      tlsOptions: {
        rejectUnauthorized: false, // 👈 Permite certificados autofirmados
      },
    },
  };

  try {
    const connection = await imaps.connect(config);
    console.log("✅ [imap-simple] Conexión IMAP establecida correctamente.");

    await connection.openBox("INBOX");
    console.log("📦 INBOX abierto correctamente.");

    const results = await connection.search(["ALL"], { bodies: ["HEADER"] });
    console.log(`📨 Correos encontrados: ${results.length}`);

    await connection.end();
    console.log("🔌 Conexión finalizada correctamente.");
  } catch (err) {
    console.error("⛔ Error en test-imap-simple:", err);
  }
}

testImapSimpleConnection();
