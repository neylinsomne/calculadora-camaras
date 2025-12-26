// src/app/page_add.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import type { SolutionDef, PriceRow } from "@/lib/prices";

// --- TIPOS ---

type TabId = "propios" | "terceros" | "info";

type CameraCartItem = {
    id: string;
    nombre: string;
    cantidad: number;
    selectedSolutionIds: string[]; // Para precios propios (SolutionDef)
    selectedServiceIds: number[]; // Para precios terceros (PriceRow)
    selectedRecording: "local" | number;
};

// Precio de grabación local en USD
const LOCAL_RECORDING_PRICE = 1.5;

// --- UTILIDADES ---

function usdToCop(valueUsd: number, rate: number) {
    return valueUsd * rate;
}

function computeDaily(monthly: number) {
    return monthly / 30;
}

function computeWeekly(monthly: number) {
    return (monthly * 7) / 30;
}

function getRecordingInfo(
    choice: "local" | number | null,
    recordingOptions: PriceRow[]
) {
    if (!choice) return null;
    if (choice === "local") {
        return {
            modalidad: "Grabación local",
            precio_usd: LOCAL_RECORDING_PRICE,
        };
    }
    const found = recordingOptions.find((r) => r.id === choice);
    if (!found) return null;
    return {
        modalidad: found.modalidad,
        precio_usd: found.precio_usd,
    };
}

export default function HomePage() {
    const [activeTab, setActiveTab] = useState<TabId>("propios");

    // Datos del nuevo schema (precios.xlsx - Propios)
    const [solutionsData, setSolutionsData] = useState<SolutionDef[]>([]);

    // Datos del viejo schema (precios_software_seguridad_nube.xlsx - Terceros)
    const [oldPrices, setOldPrices] = useState<PriceRow[]>([]);

    const [loading, setLoading] = useState(true);

    // Configuración Global
    const [exchangeRate, setExchangeRate] = useState<number>(4000);
    const [globalMarginPercent, setGlobalMarginPercent] = useState<number>(30);

    // Estado del Carrito para Propios
    const [cartItemsPropios, setCartItemsPropios] = useState<CameraCartItem[]>([
        {
            id: "CAM-01",
            nombre: "Entrada Principal",
            cantidad: 1,
            selectedSolutionIds: [],
            selectedServiceIds: [],
            selectedRecording: "local",
        },
    ]);

    // Estado del Carrito para Terceros
    const [cartItemsTerceros, setCartItemsTerceros] = useState<CameraCartItem[]>([]);

    // Cargar datos de ambos schemas
    useEffect(() => {
        Promise.all([
            fetch("/api/precios").then((res) => res.json()),
            fetch("/api/precios-old").then((res) => res.json()),
        ])
            .then(([newData, oldData]) => {
                setSolutionsData(newData as SolutionDef[]);
                setOldPrices(oldData as PriceRow[]);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error cargando precios:", err);
                setLoading(false);
            });
    }, []);

    // Separar servicios de analítica vs grabación (terceros)
    const analyticServices = oldPrices.filter(
        (p) => p.categoria !== "GRABACIÓN DE VIDEO EN LA NUBE"
    );
    const recordingOptions = oldPrices.filter(
        (p) => p.categoria === "GRABACIÓN DE VIDEO EN LA NUBE"
    );

    // --- LÓGICA CARRITO PROPIOS ---

    const getSolutionBaseCost = (solutionId: string): number => {
        const sol = solutionsData.find((s) => s.id === solutionId);
        if (!sol) return 0;
        return sol.components.reduce((acc, c) => acc + c.costUsd, 0);
    };

    const addCartItemPropios = () => {
        setCartItemsPropios((prev) => [
            ...prev,
            {
                id: `CAM-0${prev.length + 1}`,
                nombre: "",
                cantidad: 1,
                selectedSolutionIds: [],
                selectedServiceIds: [],
                selectedRecording: "local",
            },
        ]);
    };

    const removeCartItemPropios = (index: number) => {
        setCartItemsPropios((prev) => prev.filter((_, i) => i !== index));
    };

    const updateCartItemFieldPropios = <K extends keyof CameraCartItem>(
        index: number,
        field: K,
        value: CameraCartItem[K]
    ) => {
        setCartItemsPropios((prev) =>
            prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
        );
    };

    const toggleSolutionPropios = (index: number, solutionId: string) => {
        setCartItemsPropios((prev) =>
            prev.map((item, i) => {
                if (i !== index) return item;
                const already = item.selectedSolutionIds.includes(solutionId);
                return {
                    ...item,
                    selectedSolutionIds: already
                        ? item.selectedSolutionIds.filter((id) => id !== solutionId)
                        : [...item.selectedSolutionIds, solutionId],
                };
            })
        );
    };

    // --- LÓGICA CARRITO TERCEROS ---

    const addCartItemTerceros = () => {
        setCartItemsTerceros((prev) => [
            ...prev,
            {
                id: `CAM-${prev.length + 1}`,
                nombre: "",
                cantidad: 1,
                selectedSolutionIds: [],
                selectedServiceIds: [],
                selectedRecording: "local",
            },
        ]);
    };

    const removeCartItemTerceros = (index: number) => {
        setCartItemsTerceros((prev) => prev.filter((_, i) => i !== index));
    };

    const updateCartItemFieldTerceros = <K extends keyof CameraCartItem>(
        index: number,
        field: K,
        value: CameraCartItem[K]
    ) => {
        setCartItemsTerceros((prev) =>
            prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
        );
    };

    const toggleCartItemService = (index: number, serviceId: number) => {
        setCartItemsTerceros((prev) =>
            prev.map((item, i) => {
                if (i !== index) return item;
                const already = item.selectedServiceIds.includes(serviceId);
                return {
                    ...item,
                    selectedServiceIds: already
                        ? item.selectedServiceIds.filter((sid) => sid !== serviceId)
                        : [...item.selectedServiceIds, serviceId],
                };
            })
        );
    };

    // --- CÁLCULOS PROPIOS ---

    const cartCalcPropios = useMemo(() => {
        let totalMonthlyBaseUsd = 0;

        const rows = cartItemsPropios.map((item) => {
            const unitBaseUsd = item.selectedSolutionIds.reduce(
                (acc, sid) => acc + getSolutionBaseCost(sid),
                0
            );
            const rowTotalBaseUsd = unitBaseUsd * item.cantidad;
            totalMonthlyBaseUsd += rowTotalBaseUsd;

            return {
                ...item,
                unitBaseUsd,
                rowTotalBaseUsd,
            };
        });

        const marginFactor = 1 + globalMarginPercent / 100;
        const totalMonthlySaleUsd = totalMonthlyBaseUsd * marginFactor;

        return {
            rows,
            totalMonthlyBaseUsd,
            totalMonthlySaleUsd,
        };
    }, [cartItemsPropios, globalMarginPercent, solutionsData]);

    // --- CÁLCULOS TERCEROS ---

    const computeCartItemCostsTerceros = (item: CameraCartItem) => {
        const analyticSelected = analyticServices.filter((s) =>
            item.selectedServiceIds.includes(s.id)
        );
        const recordingInfo = getRecordingInfo(item.selectedRecording, recordingOptions);

        const monthlyPerCameraBaseUsd =
            analyticSelected.reduce((acc, s) => acc + s.precio_usd, 0) +
            (recordingInfo?.precio_usd ?? 0);

        const monthlyTotalBaseUsd = monthlyPerCameraBaseUsd * item.cantidad;
        const dailyTotalBaseUsd = computeDaily(monthlyPerCameraBaseUsd) * item.cantidad;
        const weeklyTotalBaseUsd = computeWeekly(monthlyPerCameraBaseUsd) * item.cantidad;

        return {
            analyticSelected,
            recordingInfo,
            monthlyPerCameraBaseUsd,
            monthlyTotalBaseUsd,
            weeklyTotalBaseUsd,
            dailyTotalBaseUsd,
        };
    };

    const cartTotalsTerceros = cartItemsTerceros.reduce(
        (acc, item) => {
            const c = computeCartItemCostsTerceros(item);
            acc.monthlyCost += c.monthlyTotalBaseUsd;
            acc.weeklyCost += c.weeklyTotalBaseUsd;
            acc.dailyCost += c.dailyTotalBaseUsd;
            return acc;
        },
        { monthlyCost: 0, weeklyCost: 0, dailyCost: 0 }
    );

    const factorTerceros = 1 + (globalMarginPercent || 0) / 100;
    const saleTotalsTerceros = {
        dailySale: cartTotalsTerceros.dailyCost * factorTerceros,
        weeklySale: cartTotalsTerceros.weeklyCost * factorTerceros,
        monthlySale: cartTotalsTerceros.monthlyCost * factorTerceros,
    };

    // --- HANDLERS ---
    const handlePrint = () => window.print();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <p className="text-slate-500">Cargando lista de precios...</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* HEADER */}
            <header className="bg-white border-b px-6 py-4 mb-6 no-print shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10">
                            <Image
                                src="/logo-empresa.png"
                                alt="Logo"
                                fill
                                className="object-contain rounded-md"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                }}
                            />
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold absolute top-0 left-0 -z-10">
                                IA
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">
                                Cotizador de Soluciones IA
                            </h1>
                            <p className="text-xs text-slate-500">
                                Propios (precios.xlsx) vs Terceros (precios_software_seguridad_nube.xlsx)
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 text-sm">
                        <div className="flex flex-col items-end">
                            <span className="text-slate-500 text-xs">TRM (COP/USD)</span>
                            <input
                                type="number"
                                value={exchangeRate}
                                onChange={(e) => setExchangeRate(Number(e.target.value))}
                                className="border rounded px-2 py-1 w-24 text-right font-mono"
                            />
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-slate-500 text-xs">Margen Global (%)</span>
                            <input
                                type="number"
                                value={globalMarginPercent}
                                onChange={(e) => setGlobalMarginPercent(Number(e.target.value))}
                                className="border rounded px-2 py-1 w-20 text-right font-mono bg-blue-50 border-blue-200 text-blue-700 font-bold"
                            />
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 pb-12">
                {/* TABS */}
                <div className="flex gap-6 border-b mb-6 no-print">
                    <button
                        onClick={() => setActiveTab("propios")}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "propios"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-slate-500"
                            }`}
                    >
                        Nuestros Precios (Propios)
                    </button>
                    <button
                        onClick={() => setActiveTab("terceros")}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "terceros"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-slate-500"
                            }`}
                    >
                        Factura Terceros
                    </button>
                    <button
                        onClick={() => setActiveTab("info")}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "info"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-slate-500"
                            }`}
                    >
                        Detalle Técnico
                    </button>
                </div>

                {/* --- TAB: PROPIOS --- */}
                {activeTab === "propios" && (
                    <div className="space-y-8">
                        {/* Tabla de Edición Propios */}
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden no-print">
                            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                                <h2 className="font-semibold text-slate-700">
                                    Configuración de Cámaras (Propios)
                                </h2>
                                <button
                                    onClick={addCartItemPropios}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                >
                                    + Agregar Cámara
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
                                        <tr>
                                            <th className="px-4 py-3 w-24">ID</th>
                                            <th className="px-4 py-3 w-48">Ubicación / Nombre</th>
                                            <th className="px-4 py-3 w-20 text-center">Cant.</th>
                                            <th className="px-4 py-3">Soluciones Activadas</th>
                                            <th className="px-4 py-3 text-right w-40">Costo Base (USD)</th>
                                            <th className="px-4 py-3 w-16 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {cartCalcPropios.rows.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 align-top">
                                                    <input
                                                        className="w-full border rounded px-2 py-1 text-xs"
                                                        value={row.id}
                                                        onChange={(e) =>
                                                            updateCartItemFieldPropios(idx, "id", e.target.value)
                                                        }
                                                    />
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <input
                                                        className="w-full border rounded px-2 py-1 text-xs"
                                                        placeholder="Ej. Entrada Norte"
                                                        value={row.nombre}
                                                        onChange={(e) =>
                                                            updateCartItemFieldPropios(idx, "nombre", e.target.value)
                                                        }
                                                    />
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        className="w-full border rounded px-2 py-1 text-center text-xs"
                                                        value={row.cantidad}
                                                        onChange={(e) =>
                                                            updateCartItemFieldPropios(idx, "cantidad", Number(e.target.value))
                                                        }
                                                    />
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                        {solutionsData.map((sol) => {
                                                            const isActive = row.selectedSolutionIds.includes(sol.id);
                                                            const cost = sol.components.reduce((a, b) => a + b.costUsd, 0);
                                                            return (
                                                                <button
                                                                    key={sol.id}
                                                                    onClick={() => toggleSolutionPropios(idx, sol.id)}
                                                                    className={`text-left text-xs px-2 py-1.5 rounded border transition-all ${isActive
                                                                            ? "bg-blue-50 border-blue-400 text-blue-700 shadow-sm"
                                                                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                                                        }`}
                                                                >
                                                                    <div className="font-medium truncate" title={sol.name}>
                                                                        {sol.name}
                                                                    </div>
                                                                    <div className="text-[10px] opacity-80">
                                                                        [{sol.etiqueta}] + ${cost.toFixed(2)} USD
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 align-top text-right font-mono text-slate-600">
                                                    ${row.rowTotalBaseUsd.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 align-top text-center">
                                                    <button
                                                        onClick={() => removeCartItemPropios(idx)}
                                                        className="text-red-400 hover:text-red-600"
                                                        title="Eliminar fila"
                                                    >
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-semibold text-slate-700 border-t">
                                        <tr>
                                            <td colSpan={4} className="px-4 py-3 text-right">
                                                Total Costo Base (Sin Margen):
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                ${cartCalcPropios.totalMonthlyBaseUsd.toFixed(2)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Resumen Comercial Propios */}
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-white rounded-xl border p-6 shadow-sm space-y-4">
                                <h3 className="font-bold text-lg text-slate-800 border-b pb-2">
                                    Resumen Comercial (Mensual)
                                </h3>

                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Costo Operativo Base (USD)</span>
                                    <span className="font-mono">
                                        ${cartCalcPropios.totalMonthlyBaseUsd.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">
                                        Margen Aplicado ({globalMarginPercent}%)
                                    </span>
                                    <span className="font-mono text-green-600">
                                        +$
                                        {(
                                            cartCalcPropios.totalMonthlySaleUsd -
                                            cartCalcPropios.totalMonthlyBaseUsd
                                        ).toFixed(2)}
                                    </span>
                                </div>
                                <div className="border-t pt-3 flex justify-between items-center text-lg font-bold">
                                    <span>Total Venta (USD)</span>
                                    <span>${cartCalcPropios.totalMonthlySaleUsd.toFixed(2)}</span>
                                </div>

                                <div className="bg-slate-100 rounded-lg p-3 mt-4">
                                    <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide font-semibold">
                                        Estimado en COP
                                    </div>
                                    <div className="text-2xl font-bold text-slate-800">
                                        ${" "}
                                        {usdToCop(
                                            cartCalcPropios.totalMonthlySaleUsd,
                                            exchangeRate
                                        ).toLocaleString("es-CO")}
                                    </div>
                                    <div className="text-xs text-slate-400 text-right mt-1">
                                        Tasa: {exchangeRate}
                                    </div>
                                </div>

                                <button
                                    onClick={handlePrint}
                                    className="w-full mt-4 bg-slate-900 text-white py-2 rounded-lg hover:bg-black transition-colors"
                                >
                                    Imprimir Cotización PDF
                                </button>
                            </div>

                            <div className="text-sm text-slate-600 space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <h4 className="font-bold text-blue-800">¿Cómo se calcula el precio?</h4>
                                <p>
                                    Este modelo suma todos los componentes reales necesarios para operar la IA propia:
                                </p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li><strong>GPU:</strong> Costo de inferencia local.</li>
                                    <li><strong>Storage/Cloud:</strong> Almacenamiento y servicios nube.</li>
                                    <li><strong>Base de Datos:</strong> Persistencia de metadatos.</li>
                                    <li><strong>Licencia/Soporte:</strong> Gestión del ciclo de vida.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: TERCEROS --- */}
                {activeTab === "terceros" && (
                    <section className="space-y-6">
                        <div className="bg-white border rounded-xl p-4 md:p-6 space-y-3">
                            <h2 className="text-xl font-semibold">Factura / propuesta por cámara (Terceros)</h2>
                            <p className="text-sm text-neutral-600">
                                Cada fila representa una cámara (o grupo de cámaras). Las columnas centrales son los servicios; si el checkbox está seleccionado, aparece el precio mensual por ese grupo.
                            </p>
                            <button
                                type="button"
                                onClick={addCartItemTerceros}
                                className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium bg-black text-white hover:bg-neutral-800"
                            >
                                + Agregar fila
                            </button>
                        </div>

                        {cartItemsTerceros.length === 0 ? (
                            <p className="text-sm text-neutral-500">
                                No hay filas en la propuesta. Haz clic en{" "}
                                <strong>"Agregar fila"</strong> para comenzar.
                            </p>
                        ) : (
                            <>
                                <div className="bg-white border rounded-xl p-4 md:p-6 space-y-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-lg font-semibold">Detalle de cámaras</h3>
                                        <p className="text-xs text-neutral-500">
                                            Los campos son editables directamente en la tabla.
                                        </p>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs md:text-sm border-collapse">
                                            <thead>
                                                <tr className="border-b bg-neutral-50">
                                                    <th className="p-2 text-left">ID</th>
                                                    <th className="p-2 text-left">Descripción</th>
                                                    <th className="p-2 text-right">Cant.</th>
                                                    <th className="p-2 text-left">Grabación</th>
                                                    {analyticServices.map((s) => (
                                                        <th key={s.id} className="p-2 text-center">
                                                            {s.categoria}
                                                        </th>
                                                    ))}
                                                    <th className="p-2 text-right">Subtotal mensual (COP$)</th>
                                                    <th className="p-2 text-center">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cartItemsTerceros.map((item, rowIndex) => {
                                                    const c = computeCartItemCostsTerceros(item);
                                                    const monthlyTotalBaseCop = usdToCop(c.monthlyTotalBaseUsd, exchangeRate);

                                                    return (
                                                        <tr
                                                            key={rowIndex}
                                                            className="border-b last:border-0 hover:bg-neutral-50"
                                                        >
                                                            <td className="p-2 align-middle">
                                                                <input
                                                                    type="text"
                                                                    value={item.id}
                                                                    onChange={(e) =>
                                                                        updateCartItemFieldTerceros(rowIndex, "id", e.target.value)
                                                                    }
                                                                    className="w-20 border rounded px-1 py-0.5 text-xs"
                                                                />
                                                            </td>
                                                            <td className="p-2 align-middle">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Portería, Bodega, etc."
                                                                    value={item.nombre}
                                                                    onChange={(e) =>
                                                                        updateCartItemFieldTerceros(rowIndex, "nombre", e.target.value)
                                                                    }
                                                                    className="w-40 md:w-56 border rounded px-1 py-0.5 text-xs"
                                                                />
                                                            </td>
                                                            <td className="p-2 align-middle text-right">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    value={item.cantidad}
                                                                    onChange={(e) => {
                                                                        const n = Number(e.target.value);
                                                                        if (!Number.isNaN(n) && n >= 0) {
                                                                            updateCartItemFieldTerceros(rowIndex, "cantidad", n);
                                                                        }
                                                                    }}
                                                                    className="w-16 border rounded px-1 py-0.5 text-xs text-right"
                                                                />
                                                            </td>
                                                            <td className="p-2 align-middle">
                                                                <select
                                                                    value={item.selectedRecording}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        if (value === "local") {
                                                                            updateCartItemFieldTerceros(rowIndex, "selectedRecording", "local");
                                                                        } else {
                                                                            updateCartItemFieldTerceros(rowIndex, "selectedRecording", Number(value));
                                                                        }
                                                                    }}
                                                                    className="border rounded px-1 py-0.5 text-xs"
                                                                >
                                                                    <option value="local">
                                                                        Local – U$ {LOCAL_RECORDING_PRICE.toFixed(2)}/cam
                                                                    </option>
                                                                    {recordingOptions.map((r) => (
                                                                        <option key={r.id} value={r.id}>
                                                                            {r.modalidad} – U$ {r.precio_usd.toFixed(2)}/cam
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            {analyticServices.map((s) => {
                                                                const included = item.selectedServiceIds.includes(s.id);
                                                                const monthlyRowPriceCop = usdToCop(
                                                                    s.precio_usd * item.cantidad,
                                                                    exchangeRate
                                                                );
                                                                return (
                                                                    <td key={s.id} className="p-2 align-middle text-center">
                                                                        <label className="inline-flex flex-col items-center gap-1">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={included}
                                                                                onChange={() => toggleCartItemService(rowIndex, s.id)}
                                                                            />
                                                                            {included && (
                                                                                <span className="text-[0.65rem] md:text-xs text-neutral-700">
                                                                                    ≈ $ {monthlyRowPriceCop.toFixed(0)} COP
                                                                                </span>
                                                                            )}
                                                                        </label>
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="p-2 align-middle text-right font-semibold">
                                                                ${monthlyTotalBaseCop.toFixed(0)} COP
                                                            </td>
                                                            <td className="p-2 align-middle text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeCartItemTerceros(rowIndex)}
                                                                    className="text-xs text-red-500 hover:underline"
                                                                >
                                                                    Borrar
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Resumen global Terceros */}
                                <div className="bg-white border rounded-xl p-4 md:p-6 space-y-4">
                                    <h2 className="text-xl font-semibold">Resumen global de la propuesta</h2>

                                    <div className="grid md:grid-cols-2 gap-4 text-sm mt-2">
                                        <div className="space-y-1">
                                            <h3 className="font-semibold">Costo base</h3>
                                            <p>
                                                Diario total:{" "}
                                                <strong>U$ {cartTotalsTerceros.dailyCost.toFixed(2)}</strong>
                                                <div className="text-[0.7rem] text-neutral-500">
                                                    ≈ $ {usdToCop(cartTotalsTerceros.dailyCost, exchangeRate).toFixed(0)} COP
                                                </div>
                                            </p>
                                            <p>
                                                Semanal total:{" "}
                                                <strong>U$ {cartTotalsTerceros.weeklyCost.toFixed(2)}</strong>
                                                <div className="text-[0.7rem] text-neutral-500">
                                                    ≈ $ {usdToCop(cartTotalsTerceros.weeklyCost, exchangeRate).toFixed(0)} COP
                                                </div>
                                            </p>
                                            <p>
                                                Mensual total:{" "}
                                                <strong>U$ {cartTotalsTerceros.monthlyCost.toFixed(2)}</strong>
                                                <div className="text-[0.7rem] text-neutral-500">
                                                    ≈ $ {usdToCop(cartTotalsTerceros.monthlyCost, exchangeRate).toFixed(0)} COP
                                                </div>
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-semibold">
                                                Precio de venta ({globalMarginPercent}% margen)
                                            </h3>
                                            <p>
                                                Diario total:{" "}
                                                <strong>U$ {saleTotalsTerceros.dailySale.toFixed(2)}</strong>
                                                <div className="text-[0.7rem] text-neutral-500">
                                                    ≈ $ {usdToCop(saleTotalsTerceros.dailySale, exchangeRate).toFixed(0)} COP
                                                </div>
                                            </p>
                                            <p>
                                                Semanal total:{" "}
                                                <strong>U$ {saleTotalsTerceros.weeklySale.toFixed(2)}</strong>
                                                <div className="text-[0.7rem] text-neutral-500">
                                                    ≈ $ {usdToCop(saleTotalsTerceros.weeklySale, exchangeRate).toFixed(0)} COP
                                                </div>
                                            </p>
                                            <p>
                                                Mensual total:{" "}
                                                <strong>U$ {saleTotalsTerceros.monthlySale.toFixed(2)}</strong>
                                                <div className="text-[0.7rem] text-neutral-500">
                                                    ≈ $ {usdToCop(saleTotalsTerceros.monthlySale, exchangeRate).toFixed(0)} COP
                                                </div>
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handlePrint}
                                        className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium bg-black text-white hover:bg-neutral-800"
                                    >
                                        Generar PDF / Imprimir propuesta
                                    </button>
                                </div>
                            </>
                        )}
                    </section>
                )}

                {/* --- TAB: INFO --- */}
                {activeTab === "info" && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-800 mb-4">
                                Desglose de Costos por Solución (Propios)
                            </h2>
                            <p className="text-sm text-slate-600 mb-6">
                                Aquí se detalla la "sumatoria total" interna de cada modelo. El precio final es la suma de estos componentes más el margen configurado.
                            </p>

                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {solutionsData.map((sol) => {
                                    const totalBase = sol.components.reduce((a, b) => a + b.costUsd, 0);
                                    return (
                                        <div key={sol.id} className="border rounded-lg overflow-hidden flex flex-col">
                                            <div className="bg-slate-50 p-3 border-b">
                                                <h3 className="font-bold text-slate-700 text-sm">{sol.name}</h3>
                                                <div className="text-xs text-slate-500 mt-1">
                                                    Costo Base:{" "}
                                                    <span className="font-mono font-bold text-slate-900">
                                                        ${totalBase.toFixed(2)} USD
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-3 flex-1">
                                                <table className="w-full text-xs">
                                                    <tbody>
                                                        {sol.components.map((comp, i) => (
                                                            <tr
                                                                key={i}
                                                                className="border-b last:border-0 border-dashed border-slate-100"
                                                            >
                                                                <td className="py-1 pr-2 text-slate-600">{comp.concept}</td>
                                                                <td className="py-1 text-right font-mono text-slate-500">
                                                                    ${comp.costUsd.toFixed(2)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="bg-blue-50 p-2 text-xs border-t border-blue-100 flex justify-between items-center">
                                                <span className="text-blue-800 font-medium">Etiqueta:</span>
                                                <span className="bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-600">
                                                    {sol.etiqueta}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}