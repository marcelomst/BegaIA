// Path: /root/begasist/app/admin/upload/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

type Me = {
  email: string;
  name?: string;
  hotelId: string; // "system" o p.ej. "hotel999"
};

type Row = {
  _id: string;
  hotelId: string;
  name: string;
  version: string;
  categories: string[];
  chunks: number;
  uploader: string | null;
  uploadedAt: string | null; // ISO o null
  originalName?: string | null;
  promptKey?: string | null;
  category?: string | null;
  language?: string | null;
  textPreview?: string | null;
};

type ChunkRow = {
  index: number;
  category?: string | null;
  promptKey?: string | null;
  text: string;
  uploadedAt?: string | null;
  similarity?: number;
};

// Toast simple local
function useToast() {
  const [items, setItems] = useState<{ id: number; kind: 'success' | 'error'; msg: string }[]>([]);
  const push = (kind: 'success' | 'error', msg: string) => {
    const id = Date.now() + Math.random();
    setItems((arr) => [...arr, { id, kind, msg }]);
    setTimeout(() => setItems((arr) => arr.filter((t) => t.id !== id)), 3800);
  };
  const Toasts = () => (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {items.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2 rounded shadow text-white ${t.kind === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
  return { push, Toasts };
}

export default function UploadPage() {
  const [user, setUser] = useState<Me | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>('');
  const [promptKey, setPromptKey] = useState<string>(''); // SOLO system
  const [description, setDescription] = useState<string>('');
  const [touchedPromptKey, setTouchedPromptKey] = useState(false);

  // Campos para "Crear documento simple" (sin necesidad de generar archivos externos)
  const [simpleTitle, setSimpleTitle] = useState<string>('');
  const [simpleBody, setSimpleBody] = useState<string>('');

  const [docs, setDocs] = useState<Row[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [details, setDetails] = useState<Record<string, ChunkRow[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

  const [uploading, setUploading] = useState(false);

  const { push, Toasts } = useToast();

  // ---- Metadata de categorías/nodos y atajos de plantillas ----
  type TemplatesResponse = {
    categories: string[];
    promptMetadata: Record<string, string[]>;
    templates: Record<string, { key: string; title: string; body: string }[]>;
  };
  const [meta, setMeta] = useState<TemplatesResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("");
  // Cuando el usuario elige una plantilla, usar su key como promptKey por defecto
  // (aplicable tanto para hoteles normales como para system). El usuario puede
  // sobreescribirlo manualmente luego si lo desea.
  useEffect(() => {
    if (selectedTemplateKey) {
      setPromptKey(selectedTemplateKey);
    }
  }, [selectedTemplateKey]);
  const selectedTemplate = useMemo(() => {
    if (!meta || !selectedCategory || !selectedTemplateKey) return null;
    return meta.templates?.[selectedCategory]?.find((t) => t.key === selectedTemplateKey) ?? null;
  }, [meta, selectedCategory, selectedTemplateKey]);

  const isSystem = user?.hotelId === 'system';
  const destination = useMemo(
    () => (isSystem ? 'system_playbook' : `${user?.hotelId}_collection`),
    [isSystem, user?.hotelId]
  );
  const prettyDate = (iso: string | null) => (!iso ? '—' : new Date(iso).toLocaleString());

  useEffect(() => {
    setLoadingMe(true);
    fetch('/api/me')
      .then((r) => r.json())
      .then((data) => setUser(data?.me || data || null))
      .finally(() => setLoadingMe(false));
  }, []);

  useEffect(() => {
    if (!user?.hotelId) return;
    setLoadingTable(true);
    fetch(`/api/hotel-documents?hotelId=${encodeURIComponent(user.hotelId)}`)
      .then((res) => res.json())
      .then((data) => setDocs(Array.isArray(data?.docs) ? data.docs : []))
      .finally(() => setLoadingTable(false));
  }, [user?.hotelId, refresh]);

  // Cargar metadata de categorías y plantillas
  useEffect(() => {
    fetch('/api/prompts/metadata')
      .then((r) => r.json())
      .then((data: TemplatesResponse) => {
        setMeta(data);
      })
      .catch(() => {});
  }, []);

  const onPickFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }, []);
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, []);
  const onDragPrevent = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const promptKeyError = useMemo(() => {
    if (!isSystem) return '';
    if (!touchedPromptKey) return '';
    if (!promptKey.trim()) return 'Prompt Key es obligatorio en “system”.';
    return '';
  }, [isSystem, promptKey, touchedPromptKey]);

  const canSubmit = useMemo(() => {
    if (!file || !user?.hotelId) return false;
    if (isSystem && !promptKey.trim()) return false;
    return true;
  }, [file, user?.hotelId, isSystem, promptKey]);

  // Al cambiar la categoría seleccionada, sugerimos esa categoría en el input superior, pero NO aplicamos título/cuerpo automáticamente
  useEffect(() => {
    if (!selectedCategory) return;
    setCategory(selectedCategory);
  }, [selectedCategory]);

  async function handleUpload() {
    if (!file || !user?.hotelId) return;
    if (isSystem && !promptKey.trim()) {
      setTouchedPromptKey(true);
      push('error', 'Completá el Prompt Key para subir al System Playbook.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('hotelId', user.hotelId);
      fd.append('uploader', user.email || 'anon');
      if (category.trim()) fd.append('category', category.trim());
  if (description.trim()) fd.append('description', description.trim());
  // Enviar promptKey: si está vacío pero hay plantilla seleccionada, usar la key de la plantilla
  {
    const effectivePromptKey = (promptKey || '').trim() || (selectedTemplateKey || '').trim();
    if (effectivePromptKey) fd.append('promptKey', effectivePromptKey);
  }

      // Importante: endpoint legacy en /pages/api (formidable)
      const res = await fetch('/api/upload-hotel-document', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        push('error', `Error al subir: ${json?.error ?? res.statusText}`);
        return;
      }
      push('success', `Documento subido correctamente (versión ${json?.version ?? 'v1'}).`);
      setFile(null);
      // en system solemos mantener category/promptKey; description se limpia
      setDescription('');
      setRefresh((n) => n + 1);
    } catch (e: any) {
      push('error', `Falló la subida: ${e?.message ?? 'desconocido'}`);
    } finally {
      setUploading(false);
    }
  }

  // Utilidad mínima para generar un nombre de archivo a partir del título
  function slugify(input: string) {
    return (input || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s_\-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase()
      || 'documento';
  }

  async function handleUploadFromText() {
    if (!user?.hotelId) return;
    if (isSystem && !promptKey.trim()) {
      setTouchedPromptKey(true);
      push('error', 'Completá el Prompt Key para subir al System Playbook.');
      return;
    }
    const content = (simpleTitle ? `# ${simpleTitle}\n\n` : '') + (simpleBody || '').trim() + '\n';
    if (content.trim().length < 10) {
      push('error', 'El contenido es demasiado corto.');
      return;
    }
    setUploading(true);
    try {
      const name = `${slugify(simpleTitle) || 'documento'}_${new Date().toISOString().slice(0,10)}.txt`;
      const blob = new Blob([content], { type: 'text/plain' });
      const virtualFile = new File([blob], name, { type: 'text/plain' });

      const fd = new FormData();
      fd.append('file', virtualFile);
      fd.append('hotelId', user.hotelId);
      fd.append('uploader', user.email || 'anon');
      if (category.trim()) fd.append('category', category.trim());
  if (description.trim()) fd.append('description', description.trim());
  // Enviar promptKey: si no se tipeó pero hay plantilla seleccionada, usar esa key
  {
    const effectivePromptKey = (promptKey || '').trim() || (selectedTemplateKey || '').trim();
    if (effectivePromptKey) fd.append('promptKey', effectivePromptKey);
  }

      const res = await fetch('/api/upload-hotel-document', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        push('error', `Error al subir: ${json?.error ?? res.statusText}`);
        return;
      }
      push('success', `Documento creado y subido (versión ${json?.version ?? 'v1'}).`);
      setSimpleTitle('');
      setSimpleBody('');
      setDescription('');
      setRefresh((n) => n + 1);
    } catch (e: any) {
      push('error', `Falló la subida: ${e?.message ?? 'desconocido'}`);
    } finally {
      setUploading(false);
    }
  }

  async function toggleRow(row: Row) {
    const key = row._id;
    const newState = !expanded[key];
    setExpanded((s) => ({ ...s, [key]: newState }));
    if (!newState) return;

    if (!details[key]) {
      setLoadingDetails((s) => ({ ...s, [key]: true }));
      const qs = new URLSearchParams();
      qs.set('hotelId', row.hotelId);
      // Para system usamos id/promptKey
      if (row.hotelId === 'system') {
        qs.set('id', row._id);
        if (row.promptKey) qs.set('promptKey', row.promptKey);
      } else if (row.originalName) {
        qs.set('originalName', row.originalName);
      }
      qs.set('version', row.version || 'v1');

      const res = await fetch(`/api/hotel-document-details?${qs.toString()}`);
      const json = await res.json().catch(() => ({}));
      const chunks: ChunkRow[] = Array.isArray(json?.chunks) ? json.chunks : [];
      setDetails((s) => ({ ...s, [key]: chunks }));
      setLoadingDetails((s) => ({ ...s, [key]: false }));
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Toasts />
      <h1 className="text-2xl font-semibold mb-4">Carga de documentos</h1>

      <div className="mb-4 text-sm text-gray-600 flex flex-wrap items-center gap-2">
        <span>
          Destino:&nbsp;
          <span className="font-medium">
            {loadingMe ? '...' : user?.hotelId === 'system' ? 'System Playbook' : user?.hotelId || '—'}
          </span>
        </span>
        {/* Badge de destino físico */}
        {!loadingMe && user?.hotelId && (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
              isSystem
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}
            title="Colección de destino en Astra"
          >
            Guardando en: {destination}
          </span>
        )}
        {/* Hint para Prompt Key cuando system */}
        {isSystem && (
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border-amber-200">
            Prompt Key requerido
          </span>
        )}

        {/* Enlace a plantilla ES (text-only) accesible desde esta página */}
        <a
          href="/templates/hotel-knowledge-template.textonly.es.txt"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto underline text-blue-600 hover:text-blue-700"
          title="Descargar plantilla text-only (ES)"
        >
          Descargar plantilla ES (text-only)
        </a>
        <a
          href="/docs/carga-kb-guia-rapida.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-600 hover:text-blue-700"
          title="Ver guía rápida de carga de KB"
        >
          Guía rápida
        </a>
      </div>

      {/* Uploader */}
      <div
        onDrop={onDrop}
        onDragOver={onDragPrevent}
        className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center gap-2 mb-4"
      >
        <input id="file" type="file" accept=".pdf,.txt" className="hidden" onChange={onPickFile} />
        <label htmlFor="file" className="cursor-pointer text-blue-600 hover:underline">
          {file ? `Archivo: ${file.name}` : 'Ningún archivo seleccionado'}
        </label>
        <p className="text-sm text-gray-500">
          Arrastra y suelta un PDF o TXT aquí, <span className="underline">o haz click</span> para seleccionar.
        </p>
      </div>

      {/* Campos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-600">Categoría sugerida</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={isSystem ? 'reservation / retrieval_based ...' : 'opcional'}
            className="border rounded px-3 py-2"
          />
        </div>

        {isSystem && (
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">
              Prompt Key <span className="text-red-600">*</span>
            </label>
            <input
              value={promptKey}
              onChange={(e) => {
                setPromptKey(e.target.value);
                if (!touchedPromptKey) setTouchedPromptKey(true);
              }}
              onBlur={() => setTouchedPromptKey(true)}
              placeholder="reservation_flow / modify_reservation / ambiguity_policy ..."
              className={`rounded px-3 py-2 border ${
                promptKeyError ? 'border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500' : 'border-gray-300'
              }`}
            />
            {promptKeyError && <div className="text-xs text-red-600">{promptKeyError}</div>}
          </div>
        )}

        <div className="flex flex-col gap-1 md:col-span-1">
          <label className="text-sm text-gray-600">Descripción</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="opcional"
            className="border rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-8">
        <button
          onClick={handleUpload}
          disabled={!canSubmit || uploading}
          className={`px-4 py-2 rounded text-white ${
            !canSubmit || uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {uploading ? 'Subiendo…' : 'Subir'}
        </button>
        <button onClick={() => setRefresh((n) => n + 1)} className="px-3 py-2 rounded border hover:bg-gray-50">
          Actualizar
        </button>
      </div>

      {/* Crear documento simple */}
      <h2 className="text-lg font-semibold mb-3 mt-10">Crear documento simple</h2>
      <div className="border rounded p-4 mb-8">
        {/* Estado vacío de categorías */}
        {meta && Array.isArray(meta.categories) && meta.categories.length === 0 && (
          <div className="mb-4 p-3 rounded border border-amber-200 bg-amber-50 text-amber-800 text-sm">
            No hay categorías definidas. Pedí al equipo técnico que complete <code>lib/prompts/promptMetadata.ts</code> con las categorías del grafo.
          </div>
        )}
        {/* Selector de categoría/nodo del graph y atajo de plantilla */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Categoría (nodo del graph)</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedTemplateKey("");
              }}
              className="border rounded px-3 py-2"
            >
              <option value="">— seleccionar —</option>
              {meta?.categories?.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-sm text-gray-600">Atajo de plantilla</label>
            <div className="flex gap-2">
              <select
                value={selectedTemplateKey}
                onChange={(e) => setSelectedTemplateKey(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                disabled={!selectedCategory}
              >
                <option value="">— seleccionar —</option>
                {selectedCategory && meta?.templates?.[selectedCategory]?.map((t) => (
                  <option key={t.key} value={t.key}>{t.title}</option>
                ))}
              </select>
              {selectedTemplateKey && (
                <button
                  type="button"
                  className="px-3 py-2 rounded border hover:bg-gray-50 whitespace-nowrap"
                  onClick={() => {
                    const tpl = selectedTemplate;
                    if (!tpl) return;
                    // Reemplazar SIEMPRE al aplicar explícitamente
                    setSimpleTitle(tpl.title);
                    setSimpleBody(tpl.body);
                    setCategory(selectedCategory);
                    // Guardar promptKey sugerido por la plantilla también para hoteles normales
                    setPromptKey(tpl.key);
                  }}
                >
                  Aplicar (reemplazar)
                </button>
              )}
              {selectedTemplateKey && (
                <button
                  type="button"
                  className="px-3 py-2 rounded border hover:bg-gray-50 whitespace-nowrap"
                  onClick={() => {
                    const tpl = selectedTemplate;
                    if (!tpl) return;
                    // Insertar sin reemplazar: solo setear título si está vacío. Concatenar cuerpo con separación.
                    setSimpleTitle((prev) => prev && prev.trim() ? prev : tpl.title);
                    setSimpleBody((prev) => {
                      const base = (prev || '').trim();
                      return base ? base + '\n\n' + tpl.body : tpl.body;
                    });
                    setCategory(selectedCategory);
                    // Guardar promptKey sugerido por la plantilla también para hoteles normales
                    setPromptKey(tpl.key);
                  }}
                >
                  Agregar (insertar)
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Estado de plantilla/promptKey */}
        {selectedTemplateKey && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 border-gray-200"
              title="Plantilla seleccionada"
            >
              Plantilla: {selectedTemplateKey}
            </span>
            {(() => {
              const pk = promptKey?.trim() || '';
              if (!pk) {
                return (
                  <span
                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border-amber-200"
                    title="Prompt Key vacío"
                  >
                    Prompt Key vacío
                  </span>
                );
              }
              if (pk === selectedTemplateKey) {
                return (
                  <span
                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border-green-200"
                    title="El Prompt Key coincide con la plantilla"
                  >
                    Prompt Key coincide
                  </span>
                );
              }
              return (
                <span
                  className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 border-red-200"
                  title="El Prompt Key no coincide con la plantilla seleccionada"
                >
                  Prompt Key no coincide (actual: {pk})
                </span>
              );
            })()}
          </div>
        )}
        {/* Vista previa de la plantilla seleccionada */}
        {selectedTemplate && (
          <div className="border rounded p-3 mb-4 bg-gray-50">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Vista previa</div>
            <div className="font-medium mb-1">{selectedTemplate.title}</div>
            <pre className="whitespace-pre-wrap text-[13px] leading-5 text-gray-800">{selectedTemplate.body}</pre>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Título</label>
            <input
              value={simpleTitle}
              onChange={(e) => setSimpleTitle(e.target.value)}
              placeholder="Ej.: Check-in y Check-out – Horarios"
              className="border rounded px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1"></div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-600">Contenido</label>
          <textarea
            value={simpleBody}
            onChange={(e) => setSimpleBody(e.target.value)}
            placeholder={"Escribí aquí el contenido en texto plano (viñetas sugeridas)."}
            className="border rounded px-3 py-2 min-h-[160px]"
          />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleUploadFromText}
            disabled={uploading || !user?.hotelId}
            className={`px-4 py-2 rounded text-white ${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {uploading ? 'Subiendo…' : 'Crear y subir'}
          </button>
          <span className="text-xs text-gray-500">Se guarda igual que un TXT subido (clasificación, embeddings y versión automáticas).</span>
        </div>
      </div>

      {/* Tabla */}
      <h2 className="text-lg font-semibold mb-3">Documentos subidos</h2>
      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Nombre</th>
              <th className="text-left px-3 py-2">Versión</th>
              <th className="text-left px-3 py-2">Idioma</th>
              <th className="text-left px-3 py-2"># Categorías</th>
              <th className="text-left px-3 py-2">Chunks</th>
              <th className="text-left px-3 py-2">Uploader</th>
              <th className="text-left px-3 py-2">Fecha</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loadingTable ? (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={7}>
                  Cargando…
                </td>
              </tr>
            ) : docs.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={7}>
                  No hay documentos cargados.
                </td>
              </tr>
            ) : (
              docs.map((r) => {
                const isOpen = !!expanded[r._id];
                return (
                  <React.Fragment key={r._id}>
                    <tr className="border-t">
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2">{r.version}</td>
                      <td className="px-3 py-2">{r.language ?? '—'}</td>
                      <td className="px-3 py-2">{r.categories?.length ?? 0}</td>
                      <td className="px-3 py-2">{r.chunks}</td>
                      <td className="px-3 py-2">{r.uploader ?? '—'}</td>
                      <td className="px-3 py-2">{prettyDate(r.uploadedAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          {/* Ver/Descargar original */}
                          {r.hotelId !== 'system' && r.originalName ? (
                            <>
                              <a
                                href={`/api/hotel-document-original?hotelId=${encodeURIComponent(r.hotelId)}&originalName=${encodeURIComponent(r.originalName)}&version=${encodeURIComponent(r.version)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 rounded border hover:bg-gray-50"
                                title="Ver texto original"
                              >
                                Ver original
                              </a>
                              <a
                                href={`/api/hotel-document-original?hotelId=${encodeURIComponent(r.hotelId)}&originalName=${encodeURIComponent(r.originalName)}&version=${encodeURIComponent(r.version)}&download=1`}
                                className="px-2 py-1 rounded border hover:bg-gray-50"
                                title="Descargar .txt"
                              >
                                Descargar .txt
                              </a>
                            </>
                          ) : r.hotelId === 'system' ? (
                            <>
                              <a
                                href={`/api/hotel-document-original?hotelId=system&id=${encodeURIComponent(r._id)}&version=${encodeURIComponent(r.version)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 rounded border hover:bg-gray-50"
                                title="Ver texto original (System)"
                              >
                                Ver original
                              </a>
                              <a
                                href={`/api/hotel-document-original?hotelId=system&id=${encodeURIComponent(r._id)}&version=${encodeURIComponent(r.version)}&download=1`}
                                className="px-2 py-1 rounded border hover:bg-gray-50"
                                title="Descargar .txt (System)"
                              >
                                Descargar .txt
                              </a>
                            </>
                          ) : null}

                          <button onClick={() => toggleRow(r)} className="px-2 py-1 rounded border hover:bg-gray-50">
                            {isOpen ? '▲' : '▼'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-gray-50">
                        <td className="px-3 py-3" colSpan={7}>
                          <div className="text-sm text-gray-700 mb-2">Detalles del documento:</div>
                          {loadingDetails[r._id] ? (
                            <div className="text-gray-500">Cargando…</div>
                          ) : details[r._id]?.length ? (
                            <div className="space-y-3">
                              {details[r._id].map((c) => (
                                <div key={c.index} className="border rounded p-3 bg-white">
                                  <div className="text-xs text-gray-500 mb-1">
                                    idx: {c.index} · cat: {c.category ?? '—'} · promptKey: {c.promptKey ?? '—'} · fecha:{' '}
                                    {prettyDate(c.uploadedAt ?? null)}
                                  </div>
                                  <pre className="whitespace-pre-wrap text-[13px] leading-5">{c.text}</pre>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-500">Sin chunks para este documento.</div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
