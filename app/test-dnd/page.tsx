// /app/test-dnd/page.tsx
"use client";
import { useDropzone } from "react-dropzone";
export default function TestDnD() {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: files => { console.log("onDrop", files); },
    accept: { "application/pdf": [], "text/plain": [] }
  });
  return (
    <div {...getRootProps()} style={{
      border: "2px dashed blue", padding: 40, margin: 60, textAlign: "center"
    }}>
      <input {...getInputProps()} />
      <div>{isDragActive ? "Drop here!" : "Drag PDF/TXT here"}</div>
    </div>
  );
}
