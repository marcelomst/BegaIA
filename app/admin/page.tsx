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
import { useCurrentUser } from "@/lib/context/UserContext";
import {
  canSeeHotelsDashboard,
  canSeeUploadDashboard,
  canSeeEmbeddingsDashboard,
  canSeePromptsDashboard,
  canSeeChannelsDashboard,
  canSeeLogsDashboard,
} from "@/lib/auth/roles";

export default function AdminDashboard() {
  const { user, loading } = useCurrentUser();

  if (loading) return <div>Cargando usuario...</div>;
  if (!user) return <div>No autenticado</div>;

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-6">
      <h1 className="text-3xl font-bold text-center mb-10 flex items-center justify-center gap-3">
        <Settings className="w-6 h-6" />
        Panel de Control
      </h1>

      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Cada card ahora depende de helpers de roles */}
        {canSeeHotelsDashboard(user.roleLevel) && (
          <DarkCard
            title={
              <div className="flex items-center gap-2">
                <Hotel className="w-5 h-5" />
                Hoteles
              </div>
            }
            description="Gestioná tus hoteles registrados en el sistema."
          >
            <Link href="/admin/hotels">
              <Button>Ver hoteles</Button>
            </Link>
          </DarkCard>
        )}

        {canSeeUploadDashboard(user.roleLevel) && (
          <DarkCard
            title={
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Carga de Datos
              </div>
            }
            description="Subí documentos o URLs para enriquecer la base de conocimiento."
          >
            <Link href="/admin/upload">
              <Button>Cargar datos</Button>
            </Link>
          </DarkCard>
        )}

        {canSeeEmbeddingsDashboard(user.roleLevel) && (
          <DarkCard
            title={
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Embeddings
              </div>
            }
            description="Consultá y gestioná la base vectorial por hotel y categoría."
          >
            <Link href="/admin/embeddings">
              <Button>Ver embeddings</Button>
            </Link>
          </DarkCard>
        )}

        {canSeePromptsDashboard(user.roleLevel) && (
          <DarkCard
            title={
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Prompts Curados
              </div>
            }
            description="Editá prompts por categoría y subcategoría."
          >
            <Link href="/admin/prompts">
              <Button>Editar prompts</Button>
            </Link>
          </DarkCard>
        )}

        {canSeeChannelsDashboard(user.roleLevel) && (
          <DarkCard
            title={
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Canales
              </div>
            }
            description="Estado de los canales conectados: web, email, WhatsApp, channel manager."
          >
            <Link href="/admin/channels">
              <Button>Ver estado</Button>
            </Link>
          </DarkCard>
        )}

        {canSeeLogsDashboard(user.roleLevel) && (
          <DarkCard
            title={
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Logs y Debug
              </div>
            }
            description="Revisá errores, ejecuciones recientes y trazas de flujo."
          >
            <Link href="/admin/logs">
              <Button>Ver logs</Button>
            </Link>
          </DarkCard>
        )}
      </div>

      <UserStatus />
    </div>
  );
}
