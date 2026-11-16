import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JewelCAD AI — 3D Parametric Jewelry CAD Studio & Vision-to-STL Engine",
  description:
    "Professional browser-based 3D parametric jewelry CAD design studio with multimodal AI vision-to-CAD reverse engineering, real-time volume & carat telemetry, and lost-wax castable STL export.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-studio-950 text-slate-100 antialiased h-screen w-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
