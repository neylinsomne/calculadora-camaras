// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { PriceRow } from "@/lib/prices";

type TabId = "simulador" | "info" | "carrito";

const LOCAL_RECORDING_PRICE = 1.5; // Grabación local U$ 1.50 / cámara

type RecordingChoice = "local" | number;

function computeDaily(monthly: number) {
  return monthly / 30;
}

function computeWeekly(monthly: number) {
  return (monthly * 7) / 30;
}

function getRecordingInfo(
  choice: RecordingChoice | null,
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

type CameraCartItem = {
  id: string;
  nombre: string;
  cantidad: number;
  selectedServiceIds: number[];
  selectedRecording: RecordingChoice;
  marginPercent: number;
};

export default function HomePage() {
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("simulador");

  // simulación general (tab 1)
  const [numCamaras, setNumCamaras] = useState<number>(10);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [selectedRecordingId, setSelectedRecordingId] =
    useState<RecordingChoice>("local");

  // carrito / factura
  const [cartItems, setCartItems] = useState<CameraCartItem[]>([]);
  const [activeCartIndex, setActiveCartIndex] = useState<number | null>(null);

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

  const selectedRecordingInfo = getRecordingInfo(
    selectedRecordingId,
    recordingOptions
  );

  const monthlyPerCamera =
    selectedAnalyticServices.reduce((acc, s) => acc + s.precio_usd, 0) +
    (selectedRecordingInfo?.precio_usd ?? 0);

  const dailyPerCamera = computeDaily(monthlyPerCamera);
  const weeklyPerCamera = computeWeekly(monthlyPerCamera);

  const monthlyTotal = monthlyPerCamera * numCamaras;
  const dailyTotal = dailyPerCamera * numCamaras;
  const weeklyTotal = weeklyPerCamera * numCamaras;

  // --- TAB 3: carrito / factura por cámara ---

  const addCartItem = () => {
    setCartItems((prev) => [
      ...prev,
      {
        id: `CAM-${prev.length + 1}`,
        nombre: "",
        cantidad: 1,
        selectedServiceIds: [],
        selectedRecording: "local",
        marginPercent: 30,
      },
    ]);
    setActiveCartIndex((prevIndex) => (prevIndex === null ? 0 : prevIndex));
  };

  const removeCartItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
    setActiveCartIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
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

  // margen SOBRE EL TOTAL mensual de la fila
  const computeCartItemCosts = (item: CameraCartItem) => {
    const analyticSelected = analyticServices.filter((s) =>
      item.selectedServiceIds.includes(s.id)
    );
    const recordingInfo = getRecordingInfo(
      item.selectedRecording,
      recordingOptions
    );

    const monthlyPerCameraBase =
      analyticSelected.reduce((acc, s) => acc + s.precio_usd, 0) +
      (recordingInfo?.precio_usd ?? 0);

    const monthlyTotalBase = monthlyPerCameraBase * item.cantidad;
    const dailyTotalBase = computeDaily(monthlyPerCameraBase) * item.cantidad;
    const weeklyTotalBase = computeWeekly(monthlyPerCameraBase) * item.cantidad;

    const factor = 1 + (item.marginPercent || 0) / 100; // margen sobre el total
    const monthlyTotalSale = monthlyTotalBase * factor;
    const dailyTotalSale = dailyTotalBase * factor;
    const weeklyTotalSale = weeklyTotalBase * factor;

    return {
      analyticSelected,
      recordingInfo,
      monthlyPerCameraBase,
      monthlyTotalBase,
      weeklyTotalBase,
      dailyTotalBase,
      monthlyTotalSale,
      weeklyTotalSale,
      dailyTotalSale,
    };
  };

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

  const handlePrintPdf = () => {
    // El usuario puede seleccionar "Guardar como PDF"
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

      {/* Contenido principal */}
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Tabs */}
        <nav className="flex gap-2 border-b pb-2 overflow-x-auto">
          <TabButton
            label="Simulador general"
            active={activeTab === "simulador"}
            onClick={() => setActiveTab("simulador")}
          />
          <TabButton
            label="Factura por cámara"
            active={activeTab === "carrito"}
            onClick={() => setActiveTab("carrito")}
          />
          <TabButton
            label="Info & diagramas"
            active={activeTab === "info"}
            onClick={() => setActiveTab("info")}
          />
        </nav>

        {/* TAB 1: Simulador general */}
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
                (placa, facial, objetos, EPI, fuego y humo).
              </p>

              {analyticServices.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Cargando lista de precios...
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
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
                          <tr
                            key={s.id}
                            className="border-b last:border-0 hover:bg-neutral-50"
                          >
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

            {/* Grabación local / nube */}
            <div className="bg-white border rounded-xl p-4 md:p-6 space-y-4">
              <h2 className="text-xl font-semibold">
                Grabación de video (local o nube)
              </h2>
              <p className="text-sm text-neutral-600">
                Elige entre <strong>grabación local</strong> (ej. NVR/DVR, costo
                de operación estimado) o un plan de grabación en la nube con
                días de retención.
              </p>

              <div className="flex flex-col md:flex-row gap-4 items-center">
                <label className="flex flex-col gap-1 w-full md:w-80">
                  Plan de grabación
                  <select
                    value={selectedRecordingId}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "local") {
                        setSelectedRecordingId("local");
                      } else {
                        setSelectedRecordingId(Number(value));
                      }
                    }}
                    className="border rounded px-2 py-1"
                  >
                    <option value="local">
                      Grabación local – U$ {LOCAL_RECORDING_PRICE.toFixed(2)} /
                      cámara
                    </option>
                    {recordingOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.modalidad} – U$ {r.precio_usd.toFixed(2)} / cámara
                      </option>
                    ))}
                  </select>
                </label>
                {selectedRecordingInfo && (
                  <div className="text-sm text-neutral-700">
                    <p>
                      <strong>Plan elegido:</strong>{" "}
                      {selectedRecordingInfo.modalidad}
                    </p>
                    <p>
                      Mensual por cámara:{" "}
                      <strong>
                        U$ {selectedRecordingInfo.precio_usd.toFixed(2)}
                      </strong>
                    </p>
                    <p>
                      Diario por cámara:{" "}
                      <strong>
                        U${" "}
                        {computeDaily(selectedRecordingInfo.precio_usd).toFixed(
                          2
                        )}
                      </strong>
                    </p>
                    <p>
                      Semanal por cámara:{" "}
                      <strong>
                        U${" "}
                        {computeWeekly(
                          selectedRecordingInfo.precio_usd
                        ).toFixed(2)}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Totales simulador general */}
            <div className="bg-white border rounded-xl p-4 md:p-6 space-y-4">
              <h2 className="text-xl font-semibold">
                Resumen de la simulación
              </h2>

              {selectedAnalyticServices.length === 0 &&
                !selectedRecordingInfo && (
                  <p className="text-sm text-neutral-600">
                    Aún no has seleccionado ningún servicio. Marca al menos uno
                    en la tabla y un plan de grabación.
                  </p>
                )}

              {(selectedAnalyticServices.length > 0 ||
                selectedRecordingInfo) && (
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

        {/* TAB 2: Factura / carrito en tabla elegante */}
        {activeTab === "carrito" && (
          <section className="space-y-6">
            <div className="bg-white border rounded-xl p-4 md:p-6 space-y-3">
              <h2 className="text-xl font-semibold">
                Factura / propuesta por cámara
              </h2>
              <p className="text-sm text-neutral-600">
                Cada fila representa una cámara (o grupo de cámaras) con sus
                servicios, tipo de grabación y un{" "}
                <strong>margen de ganancia sobre el total mensual</strong>.
              </p>
              <button
                type="button"
                onClick={addCartItem}
                className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium bg-black text-white hover:bg-neutral-800"
              >
                + Agregar fila
              </button>
            </div>

            {cartItems.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No hay filas en la propuesta. Haz clic en{" "}
                <strong>“Agregar fila”</strong> para comenzar.
              </p>
            ) : (
              <>
                {/* Tabla elegante tipo factura */}
                <div className="bg-white border rounded-xl p-4 md:p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">
                      Detalle de cámaras
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Haz clic en una fila para editarla.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm border-collapse">
                      <thead>
                        <tr className="border-b bg-neutral-50">
                          <th className="p-2 text-left">ID</th>
                          <th className="p-2 text-left">Descripción</th>
                          <th className="p-2 text-right">Cantidad</th>
                          <th className="p-2 text-left">Servicios</th>
                          <th className="p-2 text-left">Grabación</th>
                          <th className="p-2 text-right">
                            Margen sobre total (%)
                          </th>
                          <th className="p-2 text-right">Costo mensual (U$)</th>
                          <th className="p-2 text-right">
                            Precio mensual con margen (U$)
                          </th>
                          <th className="p-2 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cartItems.map((item, index) => {
                          const c = computeCartItemCosts(item);
                          const isActive = index === activeCartIndex;
                          const serviciosLabel =
                            c.analyticSelected.length === 0
                              ? "Sin analítica"
                              : c.analyticSelected
                                  .map((s) => s.categoria)
                                  .join(", ");
                          const grabacionLabel =
                            c.recordingInfo?.modalidad ?? "Sin definir";

                          return (
                            <tr
                              key={item.id}
                              className={`border-b last:border-0 cursor-pointer hover:bg-neutral-50 ${
                                isActive ? "bg-neutral-50" : ""
                              }`}
                              onClick={() => setActiveCartIndex(index)}
                            >
                              <td className="p-2 align-middle font-semibold">
                                {item.id}
                              </td>
                              <td className="p-2 align-middle max-w-[160px]">
                                <span className="block truncate">
                                  {item.nombre || "—"}
                                </span>
                              </td>
                              <td className="p-2 align-middle text-right">
                                {item.cantidad}
                              </td>
                              <td className="p-2 align-middle">
                                <span className="block truncate">
                                  {serviciosLabel}
                                </span>
                              </td>
                              <td className="p-2 align-middle">
                                {grabacionLabel}
                              </td>
                              <td className="p-2 align-middle text-right">
                                {item.marginPercent.toFixed(1)}
                              </td>
                              <td className="p-2 align-middle text-right">
                                {c.monthlyTotalBase.toFixed(2)}
                              </td>
                              <td className="p-2 align-middle text-right">
                                {c.monthlyTotalSale.toFixed(2)}
                              </td>
                              <td className="p-2 align-middle text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeCartItem(index);
                                  }}
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

                {/* Panel de edición de la fila seleccionada */}
                {activeCartIndex !== null && cartItems[activeCartIndex] && (
                  <div className="bg-white border rounded-xl p-4 md:p-6 space-y-4">
                    <h3 className="text-lg font-semibold">
                      Editar fila seleccionada
                    </h3>
                    <p className="text-xs text-neutral-600">
                      Ajusta el ID, la descripción, la cantidad, los servicios
                      de analítica, el tipo de grabación y el margen aplicado
                      sobre el total mensual de esta fila.
                    </p>

                    {(() => {
                      const item = cartItems[activeCartIndex];
                      const c = computeCartItemCosts(item);
                      return (
                        <>
                          {/* Datos básicos de la fila */}
                          <div className="grid md:grid-cols-4 gap-4 text-sm">
                            <label className="flex flex-col gap-1">
                              ID interno
                              <input
                                type="text"
                                value={item.id}
                                onChange={(e) =>
                                  updateCartItemField(
                                    activeCartIndex,
                                    "id",
                                    e.target.value
                                  )
                                }
                                className="border rounded px-2 py-1"
                              />
                            </label>
                            <label className="flex flex-col gap-1 md:col-span-2">
                              Descripción
                              <input
                                type="text"
                                placeholder="Portería principal, Bodega 1, etc."
                                value={item.nombre}
                                onChange={(e) =>
                                  updateCartItemField(
                                    activeCartIndex,
                                    "nombre",
                                    e.target.value
                                  )
                                }
                                className="border rounded px-2 py-1"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              Cantidad de cámaras
                              <input
                                type="number"
                                min={1}
                                value={item.cantidad}
                                onChange={(e) =>
                                  updateCartItemField(
                                    activeCartIndex,
                                    "cantidad",
                                    Math.max(1, Number(e.target.value) || 1)
                                  )
                                }
                                className="border rounded px-2 py-1"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              Margen sobre total mensual (%)
                              <input
                                type="number"
                                min={0}
                                value={item.marginPercent}
                                onChange={(e) =>
                                  updateCartItemField(
                                    activeCartIndex,
                                    "marginPercent",
                                    Number(e.target.value) || 0
                                  )
                                }
                                className="border rounded px-2 py-1"
                              />
                            </label>
                            <label className="flex flex-col gap-1 md:col-span-3">
                              Tipo de grabación
                              <select
                                value={item.selectedRecording}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "local") {
                                    updateCartItemField(
                                      activeCartIndex,
                                      "selectedRecording",
                                      "local"
                                    );
                                  } else {
                                    updateCartItemField(
                                      activeCartIndex,
                                      "selectedRecording",
                                      Number(value)
                                    );
                                  }
                                }}
                                className="border rounded px-2 py-1"
                              >
                                <option value="local">
                                  Grabación local – U${" "}
                                  {LOCAL_RECORDING_PRICE.toFixed(2)} / cámara
                                </option>
                                {recordingOptions.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.modalidad} – U$ {r.precio_usd.toFixed(2)}{" "}
                                    / cámara
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          {/* Servicios de analítica para esa fila */}
                          <div className="space-y-2 text-sm">
                            <h4 className="font-semibold">
                              Servicios de analítica (por cámara)
                            </h4>
                            {analyticServices.length === 0 ? (
                              <p className="text-xs text-neutral-500">
                                Cargando lista de precios...
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b bg-neutral-50">
                                      <th className="p-2 text-left">Incluir</th>
                                      <th className="p-2 text-left">
                                        Tipo de detección
                                      </th>
                                      <th className="p-2 text-right">
                                        Mensual (U$)
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {analyticServices.map((s) => {
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
                                                toggleCartItemService(
                                                  activeCartIndex,
                                                  s.id
                                                )
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
                                            {s.precio_usd.toFixed(2)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          {/* Resumen costo vs venta de esa fila */}
                          <div className="grid md:grid-cols-2 gap-4 text-sm mt-2">
                            <div className="space-y-1">
                              <h4 className="font-semibold">
                                Costo base ({item.cantidad} cámara(s))
                              </h4>
                              <p>
                                Diario total:{" "}
                                <strong>
                                  U$ {c.dailyTotalBase.toFixed(2)}
                                </strong>
                              </p>
                              <p>
                                Semanal total:{" "}
                                <strong>
                                  U$ {c.weeklyTotalBase.toFixed(2)}
                                </strong>
                              </p>
                              <p>
                                Mensual total:{" "}
                                <strong>
                                  U$ {c.monthlyTotalBase.toFixed(2)}
                                </strong>
                              </p>
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-semibold">
                                Precio con margen ({item.marginPercent}%)
                              </h4>
                              <p>
                                Diario total:{" "}
                                <strong>
                                  U$ {c.dailyTotalSale.toFixed(2)}
                                </strong>
                              </p>
                              <p>
                                Semanal total:{" "}
                                <strong>
                                  U$ {c.weeklyTotalSale.toFixed(2)}
                                </strong>
                              </p>
                              <p>
                                Mensual total:{" "}
                                <strong>
                                  U$ {c.monthlyTotalSale.toFixed(2)}
                                </strong>
                              </p>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Resumen global de la propuesta */}
                <div className="bg-white border rounded-xl p-4 md:p-6 space-y-4">
                  <h2 className="text-xl font-semibold">
                    Resumen global de la propuesta
                  </h2>
                  <p className="text-sm text-neutral-600">
                    Suma todas las filas (cámaras / grupos) y muestra el{" "}
                    <strong>costo base</strong> frente al{" "}
                    <strong>precio de venta con margen</strong>.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <h3 className="font-semibold">Costo base</h3>
                      <p>
                        Diario total:{" "}
                        <strong>U$ {cartTotals.dailyCost.toFixed(2)}</strong>
                      </p>
                      <p>
                        Semanal total:{" "}
                        <strong>U$ {cartTotals.weeklyCost.toFixed(2)}</strong>
                      </p>
                      <p>
                        Mensual total:{" "}
                        <strong>U$ {cartTotals.monthlyCost.toFixed(2)}</strong>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold">Precio de venta</h3>
                      <p>
                        Diario total:{" "}
                        <strong>U$ {cartTotals.dailySale.toFixed(2)}</strong>
                      </p>
                      <p>
                        Semanal total:{" "}
                        <strong>U$ {cartTotals.weeklySale.toFixed(2)}</strong>
                      </p>
                      <p>
                        Mensual total:{" "}
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
                    Al imprimir, selecciona “Guardar como PDF” para descargar
                    esta propuesta como documento.
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
            <p className="text-sm text-neutral-600">
              Esta sección resume el costo “oculto” de mantener un modelo propio
              de visión (por ejemplo, un YOLOv8 entrenado a medida) frente a
              usar un servicio de analítica ya gestionado por el proveedor. La
              idea es que el simulador muestre el costo del servicio, mientras
              que este diagrama recuerda cuánto costaría hacerlo todo en casa.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Columna izquierda: diagrama */}
              <div className="space-y-2">
                <h3 className="font-semibold">
                  Diagrama: modelo propio (YOLOv8)
                </h3>
                <p className="text-xs text-neutral-600">
                  El diagrama representa un flujo típico cuando gestionas tu
                  propio modelo de detección (por ejemplo, YOLOv8) para placa,
                  facial, humo u otros objetos. Cada bloque implica un costo:
                  entrenamiento, infraestructura de GPUs, almacenamiento y
                  mantenimiento continuo.
                </p>
                <div className="relative w-full h-48 md:h-64">
                  <Image
                    src="/diagrama-ia.png"
                    alt="Diagrama de arquitectura con modelo YOLOv8 propio"
                    fill
                    className="object-contain rounded-lg border bg-neutral-50"
                  />
                </div>
              </div>

              {/* Columna derecha: explicación de costes */}
              <div className="space-y-2">
                <h3 className="font-semibold">
                  “Costo YOLO” vs servicio gestionado
                </h3>
                <p className="text-sm text-neutral-600">
                  A grandes rasgos, cuando decides entrenar y operar tu propio
                  modelo (un YOLOv8 personalizado, por ejemplo), hay dos
                  caminos:
                </p>
                <ul className="text-sm list-disc list-inside text-neutral-600 space-y-1">
                  <li>
                    <strong>Un solo modelo multi–clase:</strong> un YOLO
                    entrenado para detectar placa, personas, EPI, fuego/humo,
                    etc. Simplifica la arquitectura, pero exige más cuidado en
                    el dataset y re–entrenos constantes.
                  </li>
                  <li>
                    <strong>Varios modelos especializados:</strong> uno para
                    humo/fuego, otro para facial, otro para objetos/EPI, etc.
                    Ganas precisión en tareas concretas, pero multiplicas el
                    coste de cómputo y de mantenimiento.
                  </li>
                </ul>
                <p className="text-sm text-neutral-600">
                  En ambos casos hay un “costo YOLO” aproximado que normalmente
                  no se ve en una tabla de precios:
                </p>
                <ul className="text-sm list-disc list-inside text-neutral-600 space-y-1">
                  <li>
                    <strong>Entrenamiento y re–entrenos:</strong> horas de GPU
                    para ajustar el modelo a nuevos escenarios, cámaras o
                    ángulos. Aunque no se ejecute a diario, es un coste que
                    reaparece cada cierto tiempo.
                  </li>
                  <li>
                    <strong>Infraestructura de inferencia:</strong> servidores
                    (a veces con GPU) procesando vídeo en tiempo real. Incluso
                    un nodo modesto puede representar cientos de dólares al mes
                    cuando se considera 24/7, ancho de banda y almacenamiento.
                  </li>
                  <li>
                    <strong>Operación y soporte:</strong> monitorizar el modelo,
                    actualizar librerías, resolver falsos positivos/negativos y
                    adaptar el sistema cuando cambian cámaras, firmware o
                    escenarios.
                  </li>
                </ul>
                <p className="text-sm text-neutral-600">
                  La idea de este apartado es que el cliente vea que los precios
                  del simulador ya incluyen, de forma implícita, todo ese
                  esfuerzo técnico: entrenar modelos, pagar el cómputo y
                  mantener la arquitectura viva, en lugar de asumir ese costo de
                  forma interna.
                </p>
              </div>
            </div>
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
