import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { webEnvSchema } from '@yazesim/shared/env';
import { LOCALE } from '@/i18n/request';
import './globals.css';

// Inlined at build time; next.config.ts has already validated these values.
const env = webEnvSchema.parse({
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata');
  return {
    metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
    title: { default: t('title'), template: `%s · ${t('title')}` },
    description: t('description'),
    applicationName: t('title'),
    // Only production is indexed; staging and local builds stay out of search engines.
    robots: env.NEXT_PUBLIC_APP_ENV === 'production' ? undefined : { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  // Zoom is never disabled (WCAG 2.2): no maximum-scale or user-scalable here.
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f5f0' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1714' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={LOCALE}>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
