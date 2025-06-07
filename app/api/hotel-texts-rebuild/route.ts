import { NextRequest, NextResponse } from "next/server";
import { getOriginalTextChunksFromAstra } from "@/lib/astra/hotelTextCollection";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hotelId = searchParams.get("hotelId");
    const originalName = searchParams.get("originalName");
    const version = searchParams.get("version");

    if (!hotelId || !originalName || !version) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos: hotelId, originalName, version" },
        { status: 400 }
      );
    }

    // Recupera chunks (Astra puede envolverlos)
    const raw = await getOriginalTextChunksFromAstra({ hotelId, originalName, version });

    // Extraer y tipar los chunks correctamente
    const chunks: { chunkIndex: number; textPart: string }[] = (raw as any[])
      .map(r =>
        r?.document?.document ?? 
        r?.document ?? 
        r
      )
      .filter(
        (chunk: any) =>
          chunk &&
          typeof chunk.chunkIndex === "number" &&
          typeof chunk.textPart === "string"
      );

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    // Reconstruir el texto original (ordenar y concatenar)
    const texto = chunks
      .sort((a, b) => (a.chunkIndex ?? 0) - (b.chunkIndex ?? 0))
      .map((chunk) => chunk.textPart)
      .join(""); // o .join("\n") según formato

    return new NextResponse(texto, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `inline; filename="${originalName}.txt"`
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Error reconstruyendo texto original", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
