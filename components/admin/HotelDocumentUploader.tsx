"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { toast } from "sonner";

type HotelDocumentUploaderProps = {
  hotelId: string;
  uploader: string;
  onSuccess?: () => void;
};

export default function HotelDocumentUploader({ hotelId, uploader, onSuccess }: HotelDocumentUploaderProps) {
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      toast.error("Debes seleccionar un archivo PDF o TXT válido.");
      return;
    }
    setUploading(true);
    setFileName(acceptedFiles[0].name);

    const formData = new FormData();
    formData.append("file", acceptedFiles[0]);
    formData.append("hotelId", hotelId);
    formData.append("uploader", uploader);
    if (category) formData.append("category", category);
    if (description) formData.append("description", description);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload-hotel-document");
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) setProgress(Math.round((evt.loaded / evt.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          toast.success(`✅ Documento subido correctamente. Versión: ${data.version || "?"}`);
        } catch {
          toast.success("✅ Documento subido correctamente.");
        }
        onSuccess && onSuccess();
        setFileName("");
        setCategory("");
        setDescription("");
        setProgress(0);
      } else {
        let errorMsg = "Error al subir el documento";
        try {
          const data = JSON.parse(xhr.responseText);
          errorMsg = data.error || errorMsg;
        } catch {}
        toast.error(errorMsg);
      }
    };
    xhr.onerror = () => {
      setUploading(false);
      toast.error("❌ Error de red al subir el documento.");
    };
    xhr.send(formData);
  }, [hotelId, uploader, category, description, onSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [], "text/plain": [] },
    maxFiles: 1,
    multiple: false,
    noClick: false,
    noKeyboard: false,
  });

  return (
    <Card className="mb-6 max-w-lg mx-auto">
      <CardContent>
        <div
          {...getRootProps()}
          className={`dropzone border-dashed border-2 p-6 rounded-lg text-center cursor-pointer transition
            ${isDragActive ? "bg-blue-50" : "hover:bg-muted/50"}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-10 h-10 mb-2 text-blue-600" />
            {isDragActive
              ? <p className="font-medium text-blue-600">Suelta el archivo aquí…</p>
              : <p>Arrastra y suelta un PDF o TXT aquí,<br />o haz click para seleccionar.</p>}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2">
          {/* QUITADO campo versión, solo sugerencia de categoría/desc */}
          <input
            type="text"
            placeholder="Categoría sugerida"
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="input input-bordered"
            disabled={uploading}
          />
          <input
            type="text"
            placeholder="Descripción"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="input input-bordered"
            disabled={uploading}
          />
        </div>
        {uploading && (
          <div className="mt-4">
            <p>Subiendo y procesando: <b>{fileName}</b></p>
            <progress value={progress} max="100" className="w-full h-2 rounded bg-blue-100">{progress}%</progress>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
