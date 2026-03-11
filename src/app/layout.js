import './globals.css'

export const metadata = {
  title: 'InformaDX — Informes Diagnósticos Colaborativos',
  description: 'Sistema colaborativo para informes diagnósticos clínicos',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
