// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { PriceRow } from "@/lib/prices";

type TabId = "simulador" | "info";

function computeDaily(monthly: number) {
  return monthly / 30;
}

function computeWeekly(monthly: number) {
  return (monthly * 7) / 30;
}

export default function HomePage() {
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("simulador");

  // simulación
  const [numCamaras, setNumCamaras] = useState<number>(10);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [selectedRecordingId, setSelectedRecordingId] = useState<number | "">(
    ""
  );

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

  // agregamos todos los precios mensuales por cámara
  const monthlyPerCamera =
    selectedAnalyticServices.reduce(
      (acc, s) => acc + s.precio_usd,
      0
    ) + (selectedRecordingService?.precio_usd ?? 0);

  const dailyPerCamera = computeDaily(monthlyPerCamera);
  const weeklyPerCamera = computeWeekly(monthlyPerCamera);

  const monthlyTotal = monthlyPerCamera * numCamaras;
  const dailyTotal = dailyPerCamera * numCamaras;
  const weeklyTotal = weeklyPerCamera * numCamaras;

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
                  Comparador rápido de costos por tipo de detección y grabación en la nube.
                </p>
              </div>
            </div>

            <p className="text-sm md:text-base text-neutral-600">
              Marca qué detecciones quieres (placa, facial, objetos, fuego/humo, etc.),
              ajusta el número de cámaras y visualiza el costo diario, semanal y mensual.
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
            label="Simulador"
            active={activeTab === "simulador"}
            onClick={() => setActiveTab("simulador")}
          />
          <TabButton
            label="Info & diagramas"
            active={activeTab === "info"}
            onClick={() => setActiveTab("info")}
          />
        </nav>

        {/* TAB: SIMULADOR */}
        {activeTab === "simulador" && (
          <section className="space-y-6">
            {/* Número de cámaras */}
            <div className="bg-white border rounded-xl p-4 md:p-6 space-y-4">
              <h2 className="text-xl font-semibold">Parámetros de simulación</h2>
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
                (lectura de placa, reconocimiento facial, objetos, EPI, fuego y humo).
                Cada precio mostrado es una licencia por cámara al mes; abajo se
                muestra también su equivalente diario y semanal para que puedas
                ver rápidamente el costo por día de servicio.
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

            {/* Grabación de video en la nube */}
            <div className="bg-white border rounded-xl p-4 md:p-6 space-y-4">
              <h2 className="text-xl font-semibold">
                Grabación de video en la nube
              </h2>
              <p className="text-sm text-neutral-600">
                Aquí agrupamos los planes por días de retención. Elige uno en la
                lista desplegable (1, 3, 5, 7, 15 o 30 días). El precio es por
                cámara y se suma a los demás servicios seleccionados.
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
              <h2 className="text-xl font-semibold">Resumen de la simulación</h2>

              {selectedAnalyticServices.length === 0 &&
                !selectedRecordingService && (
                  <p className="text-sm text-neutral-600">
                    Aún no has seleccionado ningún servicio. Marca al menos uno
                    en la tabla o elige un plan de grabación en la nube.
                  </p>
                )}

              {(selectedAnalyticServices.length > 0 ||
                selectedRecordingService) && (
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Por cámara</h3>
                    <p>
                      Diario:{" "}
                      <strong>U$ {dailyPerCamera.toFixed(2)}</strong>
                    </p>
                    <p>
                      Semanal:{" "}
                      <strong>U$ {weeklyPerCamera.toFixed(2)}</strong>
                    </p>
                    <p>
                      Mensual:{" "}
                      <strong>U$ {monthlyPerCamera.toFixed(2)}</strong>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">
                      Total para {numCamaras} cámaras
                    </h3>
                    <p>
                      Diario total:{" "}
                      <strong>U$ {dailyTotal.toFixed(2)}</strong>
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

        {/* TAB: INFO */}
        {activeTab === "info" && (
          <section className="bg-white border rounded-xl p-4 md:p-6 space-y-4">
            <h2 className="text-xl font-semibold">Info & diagramas</h2>
            <p className="text-sm text-neutral-600">
              Esta sección resume el costo “oculto” de mantener un modelo propio
              de visión (por ejemplo, un YOLOv8 entrenado a medida) frente a usar
              un servicio de analítica ya gestionado por el proveedor. La idea es
              que el simulador muestre el costo del servicio, mientras que este
              diagrama recuerda cuánto costaría hacerlo todo en casa.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Columna izquierda: diagrama */}
              <div className="space-y-2">
                <h3 className="font-semibold">Diagrama: modelo propio (YOLOv8)</h3>
                <p className="text-xs text-neutral-600">
                  El diagrama representa un flujo típico cuando gestionas tu propio
                  modelo de detección (por ejemplo, YOLOv8) para placa, facial, humo u
                  otros objetos. Cada bloque implica un costo: entrenamiento,
                  infraestructura de GPUs, almacenamiento y mantenimiento continuo.
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
                <h3 className="font-semibold">“Costo YOLO” vs servicio gestionado</h3>
                <p className="text-sm text-neutral-600">
                  A grandes rasgos, cuando decides entrenar y operar tu propio modelo
                  (un YOLOv8 personalizado, por ejemplo), hay dos caminos:
                </p>
                <ul className="text-sm list-disc list-inside text-neutral-600 space-y-1">
                  <li>
                    <strong>Un solo modelo multi–clase:</strong> un YOLO entrenado para
                    detectar placa, personas, EPI, fuego/humo, etc. Simplifica la
                    arquitectura, pero exige más cuidado en el dataset y re–entrenos
                    constantes.
                  </li>
                  <li>
                    <strong>Varios modelos especializados:</strong> uno para humo/fuego,
                    otro para facial, otro para objetos/EPI, etc. Ganas precisión
                    en tareas concretas, pero multiplicas el coste de cómputo y de
                    mantenimiento.
                  </li>
                </ul>
                <p className="text-sm text-neutral-600">
                  En ambos casos hay un “costo YOLO” aproximado que normalmente no se
                  ve en una tabla de precios:
                </p>
                <ul className="text-sm list-disc list-inside text-neutral-600 space-y-1">
                  <li>
                    <strong>Entrenamiento y re–entrenos:</strong> horas de GPU para
                    ajustar el modelo a nuevos escenarios, cámaras o ángulos. Aunque
                    no se ejecute a diario, es un coste que reaparece cada cierto
                    tiempo.
                  </li>
                  <li>
                    <strong>Infraestructura de inferencia:</strong> servidores (a veces
                    con GPU) procesando vídeo en tiempo real. Incluso un nodo modesto
                    puede representar cientos de dólares al mes cuando se considera
                    24/7, ancho de banda y almacenamiento.
                  </li>
                  <li>
                    <strong>Operación y soporte:</strong> monitorizar el modelo,
                    actualizar librerías, resolver falsos positivos/negativos y
                    adaptar el sistema cuando cambian cámaras, firmware o escenarios.
                  </li>
                </ul>
                <p className="text-sm text-neutral-600">
                  La idea de este apartado es que el cliente vea que los precios del
                  simulador ya incluyen, de forma implícita, todo ese esfuerzo
                  técnico: entrenar modelos, pagar el cómputo y mantener la
                  arquitectura viva, en lugar de asumir ese costo de forma interna.
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
