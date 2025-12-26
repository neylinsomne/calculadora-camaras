import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";

// --- NUEVO SCHEMA (precios.xlsx) ---

export type ComponentCost = {
  concept: string;
  costUsd: number;
  description?: string;
};

export type SolutionDef = {
  id: string;
  name: string;
  etiqueta: string;
  components: ComponentCost[];
};

export function getPricesFromExcel(): SolutionDef[] {
  const filePath = path.join(
    process.cwd(),
    "data",
    "precios.xlsx"
  );

  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<any>(sheet);

  // Group by "Solución / Categoría"
  const groupedMap = new Map<string, SolutionDef>();

  rows.forEach((row, index) => {
    const rawName = row["Solución / Categoría"];
    if (!rawName) return;

    const name = String(rawName).trim();
    const etiqueta = row["Etiqueta"] ? String(row["Etiqueta"]).trim() : "General";

    // Generate a simple ID from the name
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

    const component: ComponentCost = {
      concept: row["Concepto"] ? String(row["Concepto"]) : "Componente",
      costUsd: row["Costo Real (USD)"] ? Number(row["Costo Real (USD)"]) : 0,
      description: row["Descripción Técnica"] ? String(row["Descripción Técnica"]) : undefined
    };

    if (!groupedMap.has(name)) {
      groupedMap.set(name, {
        id,
        name,
        etiqueta,
        components: []
      });
    }

    const sol = groupedMap.get(name)!;
    sol.components.push(component);
  });

  return Array.from(groupedMap.values());
}

// --- VIEJO SCHEMA (precios_software_seguridad_nube.xlsx) ---

export type PriceRow = {
  id: number;
  categoria: string;
  servicio: string;
  modalidad: string;
  retencion_imagenes?: string;
  resolucion_predeterminada?: string;
  fps?: string;
  precio_usd: number;
  notas?: string;
};

export function getOldPricesFromExcel(): PriceRow[] {
  const filePath = path.join(
    process.cwd(),
    "data",
    "precios_software_seguridad_nube.xlsx"
  );

  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<any>(sheet);

  const prices: PriceRow[] = rows.map((row: any, index: number) => ({
    id: Number(row.id ?? index + 1),
    categoria: String(row.categoria ?? ""),
    servicio: String(row.servicio ?? ""),
    modalidad: String(row.modalidad ?? ""),
    retencion_imagenes: row.retencion_imagenes
      ? String(row.retencion_imagenes)
      : undefined,
    resolucion_predeterminada: row.resolucion_predeterminada
      ? String(row.resolucion_predeterminada)
      : undefined,
    fps: row.fps ? String(row.fps) : undefined,
    precio_usd: Number(row.precio_usd ?? 0),
    notas: row.notas ? String(row.notas) : undefined
  }));

  return prices;
}

