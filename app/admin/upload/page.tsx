// /app/admin/upload/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import HotelDocumentUploader from "@/components/admin/HotelDocumentUploader";
import { DarkCard } from "@/components/ui/DarkCard";
import { useCurrentUser } from "@/lib/context/UserContext";
import { Button } from "@/components/ui/button";
import { ChunkDetailsTable } from "@/components/admin/ChunkDetailsTable";
import { ChevronDown, ChevronUp, Sparkles, BookOpen } from "lucide-react";

type DocResumen = {
  hotelId: string;
  originalName: string;
  version: string;
  uploader: string;
  author: string | null;
  uploadedAt: string;
  categories: string[];
  categoryCount: number;
  promptKeys: string[];
  detectedLang: string;
  targetLang: string;
  chunkCount: number;
};

export default function UploadPage() {
  const { user, loading } = useCurrentUser();
  const [docs, setDocs] = useState<DocResumen[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [loadingTable, setLoadingTable] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  // Modal state
  const [showOriginalModal, setShowOriginalModal] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [originalLoading, setOriginalLoading] = useState(false);
  const [originalError, setOriginalError] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>("");

  // Ordenar docs: versión DESC global, luego fecha DESC
  const docsSorted = [...docs].sort((a, b) => {
    // Comparar versión (ej: v3 vs v2)
    const vA = parseInt(a.version?.replace(/^v/, "") || "1", 10);
    const vB = parseInt(b.version?.replace(/^v/, "") || "1", 10);
    if (vB !== vA) return vB - vA;
    // Si empatan, ordenar por fecha
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  });

  useEffect(() => {
    if (!user?.hotelId) return;
    setLoadingTable(true);
    fetch(`/api/hotel-documents?hotelId=${encodeURIComponent(user.hotelId)}`)
      .then((res) => res.json())
      .then((data) => setDocs(data.docs || []))
      .finally(() => setLoadingTable(false));
  }, [user?.hotelId, refresh]);

  const handleShowOriginal = async (doc: DocResumen) => {
    setShowOriginalModal(true);
    setOriginalText("");
    setOriginalError(null);
    setOriginalLoading(true);
    setDownloadName("");
    try {
      const params = new URLSearchParams({
        hotelId: doc.hotelId,
        originalName: doc.originalName,
        version: doc.version,
      });
      const res = await fetch(`/api/hotel-texts-rebuild?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json();
        setOriginalError(errorData.error || "No se pudo reconstruir el texto original.");
        setOriginalLoading(false);
        return;
      }
      const txt = await res.text();
      setOriginalText(txt);
      // Nombre sugerido de descarga
      setDownloadName(`${doc.originalName.replace(/\.[^/.]+$/, "")}-${doc.version}-reconstruido.txt`);
      setOriginalLoading(false);
    } catch (e: any) {
      setOriginalError(e?.message || String(e));
      setOriginalLoading(false);
    }
  };

  if (loading) return <div>Cargando usuario...</div>;
  if (!user) return <div>No autenticado</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Carga de documentos</h2>

      <DarkCard className="mb-10">
        <HotelDocumentUploader
          hotelId={user.hotelId}
          uploader={user.email}
          onSuccess={() => setRefresh((r) => r + 1)}
        />
      </DarkCard>

      <DarkCard>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Documentos subidos</h3>
          <Button
            onClick={() => setRefresh((r) => r + 1)}
            disabled={loadingTable}
          >
            {loadingTable ? "Actualizando..." : "Actualizar"}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted text-foreground">
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2">Versión</th>
                <th className="px-3 py-2"># Categorías</th>
                <th className="px-3 py-2">Chunks</th>
                <th className="px-3 py-2">Uploader</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2"></th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {docsSorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-muted-foreground">
                    No hay documentos cargados.
                  </td>
                </tr>
              )}
              {docsSorted.map((doc, i) => (
                <React.Fragment key={doc.originalName + doc.version}>
                  <tr className="border-b border-muted">
                    <td className="px-3 py-2 flex items-center gap-2">
                      {doc.originalName}
                      {i === 0 && (
                        <Sparkles className="text-yellow-400 animate-bounce" size={16} />
                      )}
                    </td>
                    <td className="px-3 py-2">{doc.version}</td>
                    <td className="px-3 py-2 text-center">{doc.categoryCount}</td>
                    <td className="px-3 py-2 text-center">{doc.chunkCount}</td>
                    <td className="px-3 py-2">{doc.uploader}</td>
                    <td className="px-3 py-2">
                      {new Date(doc.uploadedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        className="text-blue-600 hover:underline flex items-center gap-1"
                        onClick={() => setSelected(selected === i ? null : i)}
                        aria-label={selected === i ? "" : ""}
                      >
                        {selected === i ? (
                          <ChevronUp size={18} className="inline-block" />
                        ) : (
                          <ChevronDown size={18} className="inline-block" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        className="text-foreground hover:text-primary"
                        title="Ver texto original reconstruido"
                        onClick={() => handleShowOriginal(doc)}
                      >
                        <BookOpen size={18} className="inline-block" />
                      </button>
                    </td>
                  </tr>
                  {selected === i && (
                    <tr className="bg-gray-50 dark:bg-gray-900">
                      <td colSpan={8} className="px-4 py-3">
                        <strong>Detalles del documento:</strong>
                        <ChunkDetailsTable
                          hotelId={user.hotelId}
                          originalName={doc.originalName}
                          version={doc.version}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </DarkCard>

      {/* MODAL TEXTO ORIGINAL RECONSTRUIDO */}
      {showOriginalModal && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] p-4 relative overflow-y-auto">
            <button
              className="absolute top-2 right-3 text-gray-600 dark:text-gray-400 hover:text-red-500 text-xl"
              onClick={() => setShowOriginalModal(false)}
              aria-label="Cerrar modal de texto original reconstruido"
            >
              ×
            </button>
            <h4 className="font-semibold text-lg mb-2">Texto original reconstruido</h4>
            {originalLoading && (
              <div className="text-sm text-muted-foreground">Cargando texto…</div>
            )}
            {originalError && (
              <div className="text-sm text-red-600">{originalError}</div>
            )}
            {!originalLoading && !originalError && (
              <>
                <pre className="bg-gray-200 dark:bg-gray-900 rounded p-2 whitespace-pre-wrap text-xs max-h-[60vh] overflow-y-auto">
                  {originalText || <span className="text-muted-foreground">No hay texto disponible.</span>}
                </pre>
                {originalText && (
                  <a
                    href={`data:text/plain;charset=utf-8,${encodeURIComponent(originalText)}`}
                    download={downloadName}
                    className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                  >
                    Descargar TXT
                  </a>
                )}
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
