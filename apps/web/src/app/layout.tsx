import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '../lib/i18n/LanguageContext';

export const metadata: Metadata = {
  title: 'MewSense — Understand the Sound, Not Just the Meow',
  description: 'Production AI-assisted bioacoustic cat vocalization analysis and probabilistic behavioral interpretation. Understand the sound, not just the meow.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/logo-mark.svg'
  }
};

export default function RootLayout({
  children,
}: {
  children: any;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-brand-500 selection:text-white">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
