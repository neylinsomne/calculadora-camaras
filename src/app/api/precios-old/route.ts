// src/app/api/precios-old/route.ts
import { NextResponse } from "next/server";
import { getOldPricesFromExcel } from "@/lib/prices";

// Fuerza runtime Node.js (necesario para poder usar fs en Vercel)
export const runtime = "nodejs";

export async function GET() {
    try {
        const prices = getOldPricesFromExcel();
        return NextResponse.json(prices);
    } catch (error) {
        console.error("Error leyendo Excel (old):", error);
        return NextResponse.json(
            { message: "Error leyendo archivo de precios antiguo" },
            { status: 500 }
        );
    }
}
