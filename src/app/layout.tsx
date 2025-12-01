import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Calculadora Cámaras + IA",
  description: "Simulador de precios para cámaras con servicios de IA"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
