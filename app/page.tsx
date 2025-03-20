"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown"; // Importa react-markdown
// import remarkGfm from "remark-gfm";

export default function ChatPage() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const sendQuery = async () => {
    if (!query.trim()) return;
  
    setLoading(true);
    setResponse(""); 
  
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });
  
      const data = await res.json();
      
      // Verifica que la respuesta sea un string antes de actualizar el estado
      const responseText = typeof data.response === "string" 
        ? data.response 
        : JSON.stringify(data.response, null, 2); // Convierte a string para depurar
  
      setResponse(responseText);
    } catch (error) {
      console.error("Error en la consulta:", error);
      setResponse("Error al obtener respuesta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-200 p-6">
      <h1 className="text-3xl font-bold mb-4 text-white">💬 Chat con IA</h1>
      <div className="w-full max-w-lg bg-gray-800 p-4 shadow-md rounded-lg">
        <textarea
          className="w-full border border-gray-700 bg-gray-900 text-gray-200 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
          rows={3}
          placeholder="Escribe tu pregunta..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <button
          className="w-full bg-blue-600 text-white p-2 mt-3 rounded-md hover:bg-blue-700 transition"
          onClick={sendQuery}
          disabled={loading}
        >
          {loading ? "Pensando..." : "Preguntar"}
        </button>
      </div>

      {response && (
        <div className="w-full max-w-lg bg-gray-800 p-4 mt-4 shadow-md rounded-lg">
          <h2 className="text-lg font-semibold text-white">🤖 Respuesta:</h2>
          <div className="mt-2 text-gray-300">
          <ReactMarkdown
            components={{
              a: ({ ...props }) => (
                <a className="text-blue-500 underline hover:text-blue-700" {...props} />
              )
            }}
          >
            {response}
          </ReactMarkdown>
          </div>
        </div>
      )}

    </div>
  );
}
