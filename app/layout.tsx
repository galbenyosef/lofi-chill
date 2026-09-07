import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'lofi & chill — your study corner',
  description:
    'Settle into a focus session with a Pomodoro timer, lofi radio, and your own mix of rain and soft noise.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
