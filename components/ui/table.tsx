// /components/ui/table.tsx
import * as React from "react";

export function Table({ children, className }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-sm text-left ${className || ""}`}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-gray-100 dark:bg-zinc-800">{children}</thead>;
}

export function TableBody({ children }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className="border-b dark:border-zinc-700">{children}</tr>;
}

export function TableHeader({ children }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className="px-4 py-2 font-semibold">{children}</th>;
}

export function TableCell({ children }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className="px-4 py-2">{children}</td>;
}
