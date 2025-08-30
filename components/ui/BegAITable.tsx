// /components/ui/BegAITable.tsx
import { ReactNode } from "react";

interface BegAITableProps {
  headers: string[];
  children: ReactNode;
}

export function BegAITable({ headers, children }: BegAITableProps) {
  return (
    <table className="w-full table-auto border-collapse border rounded shadow-sm">
      <thead className="bg-zinc-100 dark:bg-zinc-800">
        <tr>
          {headers.map((header, idx) => (
            <th
              key={idx}
              className={`p-3 font-semibold border-b ${
                idx === headers.length - 1 ? "text-right" : "text-left"
              }`}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}
