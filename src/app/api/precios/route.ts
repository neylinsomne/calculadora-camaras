// src/app/api/precios/route.ts
import { NextResponse } from "next/server";
import { getPricesFromExcel } from "@/lib/prices";

// Fuerza runtime Node.js (necesario para poder usar fs en Vercel)
export const runtime = "nodejs";

export async function GET() {
  try {
    const prices = getPricesFromExcel();
    return NextResponse.json(prices);
  } catch (error) {
    console.error("Error leyendo Excel:", error);
    return NextResponse.json(
      { message: "Error leyendo archivo de precios" },
      { status: 500 }
    );
  }
}
