import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../hooks/useAuth'; // Dodaj import
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'GroupShare - Zarządzanie subskrypcjami grupowymi',
  description: 'Platforma do zarządzania i współdzielenia subskrypcji grupowych. Dziel koszty, zarządzaj dostępem, oszczędzaj.',
  keywords: 'subskrypcje, współdzielenie, oszczędności, zarządzanie, grupa',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        layout: {
          logoPlacement: "inside",
          socialButtonsVariant: "iconButton",
          socialButtonsPlacement: "top"
        },
        elements: {
          rootBox: "mx-auto my-0",
          card: "mx-auto shadow-md rounded-lg border border-gray-200",
          formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-sm"
        }
      }}
    >
      <html lang="pl" className={`${inter.variable} h-full`}>
        <body className="h-full bg-gray-50 flex flex-col">
          {/* Toast notifications */}
          <Toaster position="top-right" />
          
          <AuthProvider> {/* Dodaj AuthProvider */}
            {/* Header */}
            <Header />
            
            {/* Main content */}
            <main className="flex-grow">
              {children}
            </main>
            
            {/* Footer */}
            <Footer />
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}