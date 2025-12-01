// src/app/page.tsx
"use client";

import { useEffect, useState, useRef } from "react"; // NUEVO: useRef
import Image from "next/image";
import type { PriceRow } from "@/lib/prices";

type TabId = "simulador" | "info" | "carrito"; // NUEVO

function computeDaily(monthly: number) {
  return monthly / 30;
}

function computeWeekly(monthly: number) {
  return (monthly * 7) / 30;
}

// NUEVO: tipo para cada “cámara / grupo” en el carrito
type CameraCartItem = {
  id: string; // ej: CAM-1
  nombre: string; // nombre que le das: "Portería principal"
  cantidad: number; // cuántas cámaras con esta misma config
  selectedServiceIds: number[]; // servicios de analítica
  selectedRecordingId: number | "";
  marginPercent: number; // margen de ganancia (%)
};

export default function HomePage() {
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("simulador");

  // simulación general (tab 1)
  const [numCamaras, setNumCamaras] = useState<number>(10);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [selectedRecordingId, setSelectedRecordingId] = useState<number | "">(
    ""
  );

  // NUEVO: carrito por cámara
  const [cartItems, setCartItems] = useState<CameraCartItem[]>([]);
  const printSectionRef = useRef<HTMLDivElement | null>(null); // para PDF/print

  // cargar precios del backend
  useEffect(() => {
    fetch("/api/precios")
      .then((res) => res.json())
      .then((data: PriceRow[]) => setPrices(data))
      .catch((err) => console.error(err));
  }, []);

  // separar servicios de analítica vs grabación en la nube
  const analyticServices = prices.filter(
    (p) => p.categoria !== "GRABACIÓN DE VIDEO EN LA NUBE"
  );
  const recordingOptions = prices.filter(
    (p) => p.categoria === "GRABACIÓN DE VIDEO EN LA NUBE"
  );

  // --- TAB 1: simulación general ---
  const toggleServiceSelected = (id: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const selectedAnalyticServices = analyticServices.filter((s) =>
    selectedServiceIds.includes(s.id)
  );

  const selectedRecordingService =
    typeof selectedRecordingId === "number"
      ? recordingOptions.find((r) => r.id === selectedRecordingId) ?? null
      : null;

  const monthlyPerCamera =
    selectedAnalyticServices.reduce((acc, s) => acc + s.precio_usd, 0) +
    (selectedRecordingService?.precio_usd ?? 0);

  const dailyPerCamera = computeDaily(monthlyPerCamera);
  const weeklyPerCamera = computeWeekly(monthlyPerCamera);

  const monthlyTotal = monthlyPerCamera * numCamaras;
  const dailyTotal = dailyPerCamera * numCamaras;
  const weeklyTotal = weeklyPerCamera * numCamaras;

  // --- TAB 3: carrito por cámara ---

  // añadir nueva cámara al carrito
  const addCartItem = () => {
    setCartItems((prev) => [
      ...prev,
      {
        id: `CAM-${prev.length + 1}`,
        nombre: "",
        cantidad: 1,
        selectedServiceIds: [],
        selectedRecordingId: "",
        marginPercent: 30, // margen por defecto
      },
    ]);
  };

  const removeCartItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCartItemField = <K extends keyof CameraCartItem>(
    index: number,
    field: K,
    value: CameraCartItem[K]
  ) => {
    setCartItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const toggleCartItemService = (index: number, serviceId: number) => {
    setCartItems((prev) =>
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

  // cálculo de costos (base y con margen) para cada item del carrito
  const computeCartItemCosts = (item: CameraCartItem) => {
    const analyticSelected = analyticServices.filter((s) =>
      item.selectedServiceIds.includes(s.id)
    );
    const recordingSelected =
      typeof item.selectedRecordingId === "number"
        ? recordingOptions.find((r) => r.id === item.selectedRecordingId) ??
          null
        : null;

    const monthlyPerCameraBase =
      analyticSelected.reduce((acc, s) => acc + s.precio_usd, 0) +
      (recordingSelected?.precio_usd ?? 0);

    const dailyPerCameraBase = computeDaily(monthlyPerCameraBase);
    const weeklyPerCameraBase = computeWeekly(monthlyPerCameraBase);

    const monthlyTotalBase = monthlyPerCameraBase * item.cantidad;
    const dailyTotalBase = dailyPerCameraBase * item.cantidad;
    const weeklyTotalBase = weeklyPerCameraBase * item.cantidad;

    // margen de ganancia: 30% -> precio = costo * 1.3
    const factor = 1 + (item.marginPercent || 0) / 100;

    const monthlyPerCameraSale = monthlyPerCameraBase * factor;
    const dailyPerCameraSale = dailyPerCameraBase * factor;
    const weeklyPerCameraSale = weeklyPerCameraBase * factor;

    const monthlyTotalSale = monthlyTotalBase * factor;
    const dailyTotalSale = dailyTotalBase * factor;
    const weeklyTotalSale = weeklyTotalBase * factor;

    return {
      analyticSelected,
      recordingSelected,
      monthlyPerCameraBase,
      dailyPerCameraBase,
      weeklyPerCameraBase,
      monthlyTotalBase,
      dailyTotalBase,
      weeklyTotalBase,
      monthlyPerCameraSale,
      dailyPerCameraSale,
      weeklyPerCameraSale,
      monthlyTotalSale,
      dailyTotalSale,
      weeklyTotalSale,
    };
  };

  // totales globales del carrito (suma de todas las cámaras)
  const cartTotals = cartItems.reduce(
    (acc, item) => {
      const c = computeCartItemCosts(item);
      acc.monthlyCost += c.monthlyTotalBase;
      acc.weeklyCost += c.weeklyTotalBase;
      acc.dailyCost += c.dailyTotalBase;
      acc.monthlySale += c.monthlyTotalSale;
      acc.weeklySale += c.weeklyTotalSale;
      acc.dailySale += c.dailyTotalSale;
      return acc;
    },
    {
      monthlyCost: 0,
      weeklyCost: 0,
      dailyCost: 0,
      monthlySale: 0,
      weeklySale: 0,
      dailySale: 0,
    }
  );

  // “Exportar a PDF”: versión simple usando la impresión del navegador
  const handlePrintPdf = () => {
    // con esto el usuario puede elegir "Guardar como PDF"
    window.print();
  };

  return (
    <main className="min-h-screen bg-neutral-100">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-4 px-6 py-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Image
                src="/logo-empresa.png"
                alt="Logo de la empresa"
                width={40}
                height={40}
                className="rounded-md object-contain"
              />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  Simulador de servicios: Cámaras + IA
                </h1>
                <p className="text-xs md:text-sm text-neutral-500">
                  Comparador rápido de costos por tipo de detección y grabación
                  en la nube.
                </p>
              </div>
            </div>

            <p className="text-sm md:text-base text-neutral-600">
              Marca qué detecciones quieres (placa, facial, objetos, fuego/humo,
              etc.), ajusta el número de cámaras y visualiza el costo diario,
              semanal y mensual.
            </p>
          </div>

          <div className="w-full md:w-64 h-32 relative">
            <Image
              src="/header-ia.png"
              alt="Arquitectura de cámaras con IA"
              fill
              className="object-cover rounded-lg"
            />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <nav className="flex gap-2 border-b pb-2 overflow-x-auto">
          <TabButton
            label="Simulador general"
            active={activeTab === "simulador"}
            onClick={() => setActiveTab("simulador")}
          />
          <TabButton
            label="Por cámara / carrito"
            active={activeTab === "carrito"} // NUEVO
            onClick={() => setActiveTab("carrito")}
          />
          <TabButton
            label="Info & diagramas"
            active={activeTab === "info"}
            onClick={() => setActiveTab("info")}
          />
        </nav>

        {/* TAB: SIMULADOR (general) */}
        {activeTab === "simulador" && (
          <section className="space-y-6">
            {/* Número de cámaras */}
            <div className="bg-white border rounded-xl p-4 md:p-6 space-y-4">
              <h2 className="text-xl font-semibold">
                Parámetros de simulación
              </h2>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <label className="flex flex-col gap-1 w-full md:w-64">
                  Número de cámaras
                  <input
                    type="number"
                    min={1}
                    value={numCamaras}
                    onChange={(e) =>
                      setNumCamaras(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="border rounded px-2 py-1"
                  />
                </label>
                <p className="text-sm text-neutral-600">
                  El costo total se calcula multiplicando el costo por cámara
                  por este número.
                </p>
              </div>
            </div>

            {/* Servicios de analítica */}
            <div className="bg-white border rounded-xl p-4 md:p-6 space-y-4">
              <h2 className="text-xl font-semibold">
                Servicios de analítica por tipo de detección
              </h2>
              <p className="text-sm text-neutral-600">
                Marca qué tipos de detección quieres activar en cada cámara
                (lectura de placa, reconocimiento facial, objetos, EPI, fuego y
                humo)…
              </p>

              {analyticServices.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Cargando lista de precios...
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-neutral-50">
                        <th className="text-left p-2">Incluir</th>
                        <th className="text-left p-2">Tipo de detección</th>
                        <th className="text-right p-2">
                          Mensual por cámara (U$)
                        </th>
                        <th className="text-right p-2">
                          Diario por cámara (U$)
                        </th>
                        <th className="text-right p-2">
                          Semanal por cámara (U$)
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {analyticServices.map((s) => {
                        const monthly = s.precio_usd;
                        const daily = computeDaily(monthly);
                        const weekly = computeWeekly(monthly);

                        const included = selectedServiceIds.includes(s.id);

                        return (
                          <tr key={s.id} className="border-b last:border-0">
                            <td className="p-2 align-middle">
                              <input
                                type="checkbox"
                                checked={included}
                                onChange={() => toggleServiceSelected(s.id)}
                              />
                            </td>
                            <td className="p-2 align-middle">
                              <div className="font-semibold">{s.categoria}</div>
                              <div className="text-neutral-600">
                                {s.servicio}
                              </div>
                            </td>
                            <td className="p-2 text-right align-middle">
                              {monthly.toFixed(2)}
                            </td>
                            <td className="p-2 text-right align-middle">
                              {daily.toFixed(2)}
                            </td>
                            <td className="p-2 text-right align-middle">
                              {weekly.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Grabación de video en la nube */}
            <div className="bg-white border rounded-xl p-4 md:p-6 space-y-4">
              <h2 className="text-xl font-semibold">
                Grabación de video en la nube
              </h2>
              <p className="text-sm text-neutral-600">
                Elige un plan de retención (1, 3, 5, 7, 15, 30 días)…
              </p>

              <div className="flex flex-col md:flex-row gap-4 items-center">
                <label className="flex flex-col gap-1 w-full md:w-80">
                  Plan de retención en la nube
                  <select
                    value={selectedRecordingId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedRecordingId(value ? Number(value) : "");
                    }}
                    className="border rounded px-2 py-1"
                  >
                    <option value="">Sin grabación en la nube</option>
                    {recordingOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.modalidad} – U$ {r.precio_usd.toFixed(2)} / cámara
                      </option>
                    ))}
                  </select>
                </label>
                {selectedRecordingService && (
                  <div className="text-sm text-neutral-700">
                    <p>
                      <strong>Plan elegido:</strong>{" "}
                      {selectedRecordingService.modalidad}
                    </p>
                    <p>
                      Mensual por cámara:{" "}
                      <strong>
                        U$ {selectedRecordingService.precio_usd.toFixed(2)}
                      </strong>
                    </p>
                    <p>
                      Diario por cámara:{" "}
                      <strong>
                        U${" "}
                        {computeDaily(
                          selectedRecordingService.precio_usd
                        ).toFixed(2)}
                      </strong>
                    </p>
                    <p>
                      Semanal por cámara:{" "}
                      <strong>
                        U${" "}
                        {computeWeekly(
                          selectedRecordingService.precio_usd
                        ).toFixed(2)}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Totales */}
            <div className="bg-white border rounded-xl p-4 md:p-6 space-y-4">
              <h2 className="text-xl font-semibold">
                Resumen de la simulación
              </h2>

              {selectedAnalyticServices.length === 0 &&
                !selectedRecordingService && (
                  <p className="text-sm text-neutral-600">
                    Aún no has seleccionado ningún servicio…
                  </p>
                )}

              {(selectedAnalyticServices.length > 0 ||
                selectedRecordingService) && (
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Por cámara</h3>
                    <p>
                      Diario: <strong>U$ {dailyPerCamera.toFixed(2)}</strong>
                    </p>
                    <p>
                      Semanal: <strong>U$ {weeklyPerCamera.toFixed(2)}</strong>
                    </p>
                    <p>
                      Mensual: <strong>U$ {monthlyPerCamera.toFixed(2)}</strong>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">
                      Total para {numCamaras} cámaras
                    </h3>
                    <p>
                      Diario total: <strong>U$ {dailyTotal.toFixed(2)}</strong>
                    </p>
                    <p>
                      Semanal total:{" "}
                      <strong>U$ {weeklyTotal.toFixed(2)}</strong>
                    </p>
                    <p>
                      Mensual total:{" "}
                      <strong>U$ {monthlyTotal.toFixed(2)}</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB: CARRITO / POR CÁMARA */}
        {activeTab === "carrito" && (
          <section className="space-y-6">
            <div className="bg-white border rounded-xl p-4 md:p-6 space-y-3">
              <h2 className="text-xl font-semibold">
                Carrito por cámara / propuesta detallada
              </h2>
              <p className="text-sm text-neutral-600">
                Aquí puedes crear una propuesta detallada por cámara (o grupo de
                cámaras), asignar un nombre/ID, elegir servicios específicos y
                definir un{" "}
                <strong>margen de ganancia (%) sobre el costo calculado</strong>
                .
              </p>
              <button
                type="button"
                onClick={addCartItem}
                className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium bg-black text-white hover:bg-neutral-800"
              >
                + Agregar cámara / grupo
              </button>
            </div>

            {cartItems.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No hay cámaras en el carrito. Haz clic en{" "}
                <strong>“Agregar cámara / grupo”</strong> para empezar.
              </p>
            ) : (
              <>
                {cartItems.map((item, index) => {
                  const costs = computeCartItemCosts(item);
                  return (
                    <div
                      key={item.id}
                      className="bg-white border rounded-xl p-4 md:p-6 space-y-4"
                    >
                      <div className="flex flex-col md:flex-row gap-4 md:items-end">
                        <div className="flex-1 flex flex-col gap-1">
                          <span className="text-xs text-neutral-500">
                            ID interno
                          </span>
                          <input
                            type="text"
                            value={item.id}
                            onChange={(e) =>
                              updateCartItemField(index, "id", e.target.value)
                            }
                            className="border rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <span className="text-xs text-neutral-500">
                            Nombre / descripción
                          </span>
                          <input
                            type="text"
                            placeholder="Portería principal, Bodega 1, etc."
                            value={item.nombre}
                            onChange={(e) =>
                              updateCartItemField(
                                index,
                                "nombre",
                                e.target.value
                              )
                            }
                            className="border rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-1 w-full md:w-32">
                          <span className="text-xs text-neutral-500">
                            Cantidad de cámaras
                          </span>
                          <input
                            type="number"
                            min={1}
                            value={item.cantidad}
                            onChange={(e) =>
                              updateCartItemField(
                                index,
                                "cantidad",
                                Math.max(1, Number(e.target.value) || 1)
                              )
                            }
                            className="border rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-1 w-full md:w-32">
                          <span className="text-xs text-neutral-500">
                            Margen (%)
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={item.marginPercent}
                            onChange={(e) =>
                              updateCartItemField(
                                index,
                                "marginPercent",
                                Number(e.target.value) || 0
                              )
                            }
                            className="border rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCartItem(index)}
                          className="text-xs text-red-500 hover:underline mt-2 md:mt-0"
                        >
                          Eliminar
                        </button>
                      </div>

                      {/* Servicios de analítica por cámara */}
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">
                          Servicios de analítica (por cámara)
                        </h3>
                        {analyticServices.length === 0 ? (
                          <p className="text-xs text-neutral-500">
                            Cargando lista de precios...
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b bg-neutral-50">
                                  <th className="text-left p-2">Incluir</th>
                                  <th className="text-left p-2">
                                    Tipo de detección
                                  </th>
                                  <th className="text-right p-2">
                                    Mensual (U$)
                                  </th>
                                  <th className="text-right p-2">
                                    Diario (U$)
                                  </th>
                                  <th className="text-right p-2">
                                    Semanal (U$)
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {analyticServices.map((s) => {
                                  const monthly = s.precio_usd;
                                  const daily = computeDaily(monthly);
                                  const weekly = computeWeekly(monthly);

                                  const included =
                                    item.selectedServiceIds.includes(s.id);

                                  return (
                                    <tr
                                      key={s.id}
                                      className="border-b last:border-0"
                                    >
                                      <td className="p-2 align-middle">
                                        <input
                                          type="checkbox"
                                          checked={included}
                                          onChange={() =>
                                            toggleCartItemService(index, s.id)
                                          }
                                        />
                                      </td>
                                      <td className="p-2 align-middle">
                                        <div className="font-semibold">
                                          {s.categoria}
                                        </div>
                                        <div className="text-neutral-600">
                                          {s.servicio}
                                        </div>
                                      </td>
                                      <td className="p-2 text-right align-middle">
                                        {monthly.toFixed(2)}
                                      </td>
                                      <td className="p-2 text-right align-middle">
                                        {daily.toFixed(2)}
                                      </td>
                                      <td className="p-2 text-right align-middle">
                                        {weekly.toFixed(2)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Grabación por cámara */}
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">
                          Grabación en la nube (por cámara)
                        </h3>
                        <label className="flex flex-col gap-1 w-full md:w-80 text-xs">
                          Plan de retención
                          <select
                            value={item.selectedRecordingId}
                            onChange={(e) =>
                              updateCartItemField(
                                index,
                                "selectedRecordingId",
                                e.target.value ? Number(e.target.value) : ""
                              )
                            }
                            className="border rounded px-2 py-1 text-xs"
                          >
                            <option value="">Sin grabación en la nube</option>
                            {recordingOptions.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.modalidad} – U$ {r.precio_usd.toFixed(2)} /
                                cámara
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      {/* Resumen por cámara (costo vs precio de venta) */}
                      <div className="grid md:grid-cols-2 gap-4 text-xs mt-2">
                        <div className="space-y-1">
                          <h4 className="font-semibold">
                            Costo (base) {item.cantidad} cámara(s)
                          </h4>
                          <p>
                            Diario:{" "}
                            <strong>
                              U$ {costs.dailyTotalBase.toFixed(2)}
                            </strong>
                          </p>
                          <p>
                            Semanal:{" "}
                            <strong>
                              U$ {costs.weeklyTotalBase.toFixed(2)}
                            </strong>
                          </p>
                          <p>
                            Mensual:{" "}
                            <strong>
                              U$ {costs.monthlyTotalBase.toFixed(2)}
                            </strong>
                          </p>
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-semibold">
                            Precio con margen ({item.marginPercent}%)
                          </h4>
                          <p>
                            Diario:{" "}
                            <strong>
                              U$ {costs.dailyTotalSale.toFixed(2)}
                            </strong>
                          </p>
                          <p>
                            Semanal:{" "}
                            <strong>
                              U$ {costs.weeklyTotalSale.toFixed(2)}
                            </strong>
                          </p>
                          <p>
                            Mensual:{" "}
                            <strong>
                              U$ {costs.monthlyTotalSale.toFixed(2)}
                            </strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Resumen global + “PDF” */}
                <div
                  ref={printSectionRef}
                  className="bg-white border rounded-xl p-4 md:p-6 space-y-4"
                >
                  <h2 className="text-xl font-semibold">
                    Resumen global de la propuesta
                  </h2>
                  <p className="text-sm text-neutral-600">
                    Este resumen suma todas las cámaras / grupos y separa el{" "}
                    <strong>costo base</strong> del{" "}
                    <strong>precio de venta con margen</strong>.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <h3 className="font-semibold">Costo (base)</h3>
                      <p>
                        Diario:{" "}
                        <strong>U$ {cartTotals.dailyCost.toFixed(2)}</strong>
                      </p>
                      <p>
                        Semanal:{" "}
                        <strong>U$ {cartTotals.weeklyCost.toFixed(2)}</strong>
                      </p>
                      <p>
                        Mensual:{" "}
                        <strong>U$ {cartTotals.monthlyCost.toFixed(2)}</strong>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold">Precio de venta</h3>
                      <p>
                        Diario:{" "}
                        <strong>U$ {cartTotals.dailySale.toFixed(2)}</strong>
                      </p>
                      <p>
                        Semanal:{" "}
                        <strong>U$ {cartTotals.weeklySale.toFixed(2)}</strong>
                      </p>
                      <p>
                        Mensual:{" "}
                        <strong>U$ {cartTotals.monthlySale.toFixed(2)}</strong>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePrintPdf}
                    className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium bg-black text-white hover:bg-neutral-800"
                  >
                    Generar PDF / Imprimir propuesta
                  </button>
                  <p className="text-xs text-neutral-500">
                    Tip: en el cuadro de diálogo de impresión, elige{" "}
                    <strong>“Guardar como PDF”</strong> para descargarlo. Más
                    adelante podemos cambiarlo a jsPDF/html2canvas si quieres un
                    PDF 100% automático.
                  </p>
                </div>
              </>
            )}
          </section>
        )}

        {/* TAB: INFO */}
        {activeTab === "info" && (
          <section className="bg-white border rounded-xl p-4 md:p-6 space-y-4">
            <h2 className="text-xl font-semibold">Info & diagramas</h2>
            {/* ... aquí va tal cual tu contenido original de info ... */}
            <p className="text-sm text-neutral-600">
              Esta sección resume el costo “oculto” de mantener un modelo propio
              de visión…
            </p>
            {/* resto de tu contenido de info */}
          </section>
        )}
      </div>
    </main>
  );
}

type TabButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function TabButton({ label, active, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 text-sm rounded-t-lg border-b-2 ${
        active
          ? "border-black text-black font-semibold"
          : "border-transparent text-neutral-500 hover:text-neutral-800"
      }`}
    >
      {label}
    </button>
  );
}
