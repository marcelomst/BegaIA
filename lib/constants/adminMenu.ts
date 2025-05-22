// /lib/constants/adminMenu.ts
import { Home, Hotel, Upload, Brain, FileText, Users, KeyRound } from "lucide-react";

export const ADMIN_MENU_ITEMS = [
  {
    label: "Inicio",
    href: "/admin",
    icon:  Home,
    minRole: 0,
  },
  {
    label: "Hoteles",
    href: "/admin/hotels",
    icon:  Hotel,
    minRole: 0,
    maxRole: 0,
  },
  {
    label: "Carga de datos",
    href: "/admin/upload",
    icon:  Upload,
    minRole: 0,
    maxRole: 19,
  },
  {
    label: "Prompts",
    href: "/admin/prompts",
    icon:  Brain,
    minRole: 0,
    maxRole: 19,
  },
  {
    label: "Logs",
    href: "/admin/logs",
    icon:  FileText,
    minRole: 0,
    maxRole: 19,
  },
];
