import type { Metadata } from 'next';
import { Syne, JetBrains_Mono } from 'next/font/google';
import './v2.css';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-v2-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-v2-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Pitwall — iRacing Season Tracker',
  description: 'Season analytics for the serious sim racer',
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return <div className={`v2 ${syne.variable} ${jetbrainsMono.variable}`}>{children}</div>;
}
