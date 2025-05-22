// scripts/set-smtp.ts
import { updateHotelConfig } from "../lib/config/hotelConfig.server";

(async () => {
  const hotelId = "hotel999"; // Cambiá esto si es otro hotel
  const smtpSettings = {
    imapHost: "imap.gmail.com",
    imapPort: 993,
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    emailAddress: "begamshop.ventas@gmail.com", // Cambiar
    password: "umammswkuzoakqqu", // Cambiar
    secure: false
  };
  await updateHotelConfig(hotelId, {
    emailSettings: smtpSettings,
    lastUpdated: new Date().toISOString()
  });

  console.log("✅ Configuración SMTP actualizada para", hotelId);
})();
