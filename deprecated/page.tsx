// /app/admin/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DarkCard } from "@/components/ui/DarkCard";
import {
  Hotel,
  Upload,
  Brain,
  BookOpen,
  Server,
  FileText,
  Settings,
} from "lucide-react";
import UserStatus from "@/components/UsertStatus";
import { useCurrentUser } from "@/lib/context/UserContext"; // 👈

export default function AdminDashboard() {
  const { user, loading } = useCurrentUser();
  console.log("👤 user desde contexto:", user, "loading:", loading);
  if (loading) {
    return <div className="p-6 text-center text-gray-500">Cargando usuario...</div>;
  }
  if (!user) {
    return <div className="p-6 text-center text-red-600">No se pudo cargar el usuario.</div>;
  }

  // Cards configurados por roles
  const allCards = [
    {
      key: "hotels",
      roleMin: 0,
      roleMax: 19,
      node: (
        <DarkCard
          title={<div className="flex items-center gap-2"><Hotel className="w-5 h-5" />Hoteles</div>}
          description="Gestioná tus hoteles registrados en el sistema."
        >
          <Link href="/admin/hotels"><Button>Ver hoteles</Button></Link>
        </DarkCard>
      ),
    },
    {
      key: "upload",
      roleMin: 0,
      roleMax: 19,
      node: (
        <DarkCard
          title={<div className="flex items-center gap-2"><Upload className="w-5 h-5" />Carga de Datos</div>}
          description="Subí documentos o URLs para enriquecer la base de conocimiento."
        >
          <Link href="/admin/upload"><Button>Cargar datos</Button></Link>
        </DarkCard>
      ),
    },
    {
      key: "embeddings",
      roleMin: 0,
      roleMax: 19,
      node: (
        <DarkCard
          title={<div className="flex items-center gap-2"><Brain className="w-5 h-5" />Embeddings</div>}
          description="Consultá y gestioná la base vectorial por hotel y categoría."
        >
          <Link href="/admin/embeddings"><Button>Ver embeddings</Button></Link>
        </DarkCard>
      ),
    },
    {
      key: "prompts",
      roleMin: 0,
      roleMax: 19,
      node: (
        <DarkCard
          title={<div className="flex items-center gap-2"><BookOpen className="w-5 h-5" />Prompts Curados</div>}
          description="Editá prompts por categoría y subcategoría."
        >
          <Link href="/admin/prompts"><Button>Editar prompts</Button></Link>
        </DarkCard>
      ),
    },
    {
      key: "channels",
      roleMin: 0,
      roleMax: 99, // todos los roles ven canales
      node: (
        <DarkCard
          title={<div className="flex items-center gap-2"><Server className="w-5 h-5" />Canales</div>}
          description="Estado de los canales conectados: web, email, WhatsApp, channel manager."
        >
          <Link href="/admin/channels"><Button>Ver estado</Button></Link>
        </DarkCard>
      ),
    },
    {
      key: "logs",
      roleMin: 0,
      roleMax: 19,
      node: (
        <DarkCard
          title={<div className="flex items-center gap-2"><FileText className="w-5 h-5" />Logs y Debug</div>}
          description="Revisá errores, ejecuciones recientes y trazas de flujo."
        >
          <Link href="/admin/logs"><Button>Ver logs</Button></Link>
        </DarkCard>
      ),
    },
  ];

  // Solo muestra los cards según el roleLevel
  const visibleCards = allCards.filter(
    (card) =>
      user.roleLevel >= card.roleMin && user.roleLevel <= card.roleMax
  );

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-6">
      <h1 className="text-3xl font-bold text-center mb-10 flex items-center justify-center gap-3">
        <Settings className="w-6 h-6" />
        Panel de Control
      </h1>

      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {visibleCards.map(card => (
          <div key={card.key}>{card.node}</div>
        ))}
      </div>
      <UserStatus />
    </div>
  );
}
