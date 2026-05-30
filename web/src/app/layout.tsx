import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Talad Nod — ระบบรับออเดอร์ตลาดนัด',
  description: 'สั่งสินค้าจากร้านค้าในตลาดนัด สะดวก รวดเร็ว ได้ของไว',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col grain-overlay">
        <Providers>
          <Navbar />
          <main className="flex-1 pt-16">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
