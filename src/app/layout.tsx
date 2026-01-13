import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Tertil - Kuran Okuma Programları',
  description:
    'Kuran-ı Kerim okuma programlarını paylaşın, hatim organizasyonları oluşturun ve toplulukla birlikte okuyun.',
  keywords: ['kuran', 'hatim', 'yasin', 'ihlas', 'okuma programı', 'islam', 'tertil'],
  authors: [{ name: 'Tertil Team' }],
  openGraph: {
    title: 'Tertil - Kuran Okuma Programları',
    description: 'Kuran-ı Kerim okuma programlarını paylaşın ve toplulukla birlikte okuyun.',
    type: 'website',
    locale: 'tr_TR',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
