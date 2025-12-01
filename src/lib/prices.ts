import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";

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

export function getPricesFromExcel(): PriceRow[] {
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
