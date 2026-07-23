import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Panel de Administración",
  description: "Panel de administración dinámico",
};

const INIT_SCRIPT = `
(function () {
  try {
    // 1. Paleta de colores sincronizada con useThemeColor.ts
    var palettes = {
      rojo: { primary: 'oklch(44.4% 0.177 26.899)' },
      azul: { primary: 'oklch(37.9% 0.146 265.522)' },
      esmeralda: { primary: 'oklch(43.2% 0.095 166.913)' },
      indigo: { primary: 'oklch(35.9% 0.144 278.697)' },
      cyan: { primary: 'oklch(71.5% 0.143 215.221)' },
      lima: { primary: 'oklch(64.8% 0.2 131.684)' },
      purpura: { primary: 'oklch(43.8% 0.218 303.724)' },
      ambar: { primary: 'oklch(55.5% 0.163 48.998)' },
    };

    // Color
    var savedTheme = localStorage.getItem('app-theme-color');
    if (savedTheme && palettes[savedTheme]) {
      document.documentElement.style.setProperty('--primary', palettes[savedTheme].primary);
    }

    // Nombre de la empresa
    var savedName = localStorage.getItem('app-company-name');
    document.title = savedName || 'Panel de Administración';

    // Favicon
    var savedIcon = localStorage.getItem('app-company-icon');
    if (savedIcon) {
      var favicon = document.querySelector("link[rel*='icon']");
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = savedIcon;
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}