// /app/admin/roles/page.tsx

import React from "react";
import { RoleLabels, RoleLevels, type RoleLevel } from "@/constants/roles";

const supportedLanguages = ["spa", "eng", "por", "fra", "ita", "rus"];
const roleLevels: RoleLevel[] = [RoleLevels.TECHNICAL, RoleLevels.MANAGER, RoleLevels.STANDARD];

export default function RolesPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Etiquetas por Rol y Lenguaje</h1>
      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th className="border p-2">Nivel</th>
            {supportedLanguages.map((lang) => (
              <th key={lang} className="border p-2 text-center uppercase">{lang}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roleLevels.map((role) => (
            <tr key={role}>
              <td className="border p-2 font-medium text-center">{role}</td>
              {supportedLanguages.map((lang) => (
                <td key={lang} className="border p-2 text-center">
                  {RoleLabels[role][lang] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
