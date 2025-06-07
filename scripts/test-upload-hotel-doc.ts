// /root/begasist/scripts/test-upload-hotel-doc.ts

import fetch from "node-fetch";


import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as FormDataModule from "form-data";
const FormData = (FormDataModule as any).default || FormDataModule;
// 👇 Para compatibilidad ESM:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Cambia esto por el path real de tu PDF de prueba:
const pdfPath = path.resolve(__dirname, "hotel-demo-en-textonly.pdf");

const API_URL = "http://localhost:3000/api/upload-hotel-document";

async function uploadDocument() {
  const form = new (FormData as any)();

  form.append("hotelId", "hotel999"); // O el hotelId que corresponda
  form.append("uploader", "marcelomst1@gmail.com");
  form.append("file", fs.createReadStream(pdfPath), {
    filename: "hotel-demo-en-textonly.pdf",
    contentType: "application/pdf",
  });
  // Opcionales:
  form.append("version", "v1");
  form.append("category", "retrieval_based");
  form.append("author", "Automated Script");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: form as any,
      // No agregues headers, form-data los setea solo
    });
    const text = await res.text();
    console.log("Respuesta cruda:", text);
    // Intentá parsear igual
    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      console.error("Respuesta no es JSON:", err);
      return;
    }
    console.log("📝 Resultado del upload:", JSON.stringify(json, null, 2));

    json = await res.json();
    console.log("📝 Resultado del upload:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("❌ Error en upload:", err);
  }
}

uploadDocument();
