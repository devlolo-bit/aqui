import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/fab-client";
import { t } from "@/lib/fab-i18n";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export type DataTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  render?: (row: T) => React.ReactNode;
  accessor?: (row: T) => unknown;   // valor p/ ordenar/buscar (default: row[key])
};

/**
 * DataTable — a table with search + sorting + pagination (client-side). The `rows` have to have an `id`.
 * `<DataTable columns={[{key:'name',header:'Nome',sortable:true}]} rows={data} />`.
 */
function DataTable<T extends { id: string | number }>({
  columns, rows, searchable = true, pageSize = 10, loading = false, emptyText = "Nada por aqui ainda.", className,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  searchable?: boolean;
  pageSize?: number;
  loading?: boolean;
  emptyText?: string;
  className?: string;
}) {
  const loc = useLocale();
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = React.useState(1);

  const val = (row: T, col: DataTableColumn<T>) =>
    col.accessor ? col.accessor(row) : (row as Record<string, unknown>)[col.key];

  const filtered = React.useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => columns.some((c) => String(val(r, c) ?? "").toLowerCase().includes(q)));
  }, [rows, query, columns]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      const av = val(a, col), bv = val(b, col);
      const cmp = av == null ? -1 : bv == null ? 1 : av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount);
  const pageRows = sorted.slice((current - 1) * pageSize, current * pageSize);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" }));

  return (
    <div className={cn("space-y-3", className)}>
      {searchable && (
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder={t(loc, "ui.search")}
            className="h-9 w-full rounded-md border border-input bg-background pr-3 pl-9 text-base md:text-[13px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15"
          />
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={cn(c.align === "right" && "text-right", c.align === "center" && "text-center")}>
                  {c.sortable ? (
                    <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-foreground">
                      {c.header}
                      {sort?.key === c.key ? (sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-40" />}
                    </button>
                  ) : c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>{columns.map((c) => <TableCell key={c.key}><Skeleton className="h-4 w-24" /></TableCell>)}</TableRow>
              ))
            ) : pageRows.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length} className="p-0"><EmptyState title={emptyText} className="rounded-none border-0 bg-transparent" /></TableCell></TableRow>
            ) : (
              pageRows.map((row) => (
                <TableRow key={String(row.id)}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={cn(c.align === "right" && "text-right", c.align === "center" && "text-center")}>
                      {c.render ? c.render(row) : String(val(row, c) ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {pageCount > 1 && <Pagination page={current} pageCount={pageCount} onPageChange={setPage} />}
    </div>
  );
}

export { DataTable };
