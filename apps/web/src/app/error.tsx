'use client';

import { useTranslations } from 'next-intl';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('error');
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 sm:px-10">
      <h1 className="font-serif text-4xl tracking-tight">{t('title')}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-muted">{t('body')}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex min-h-11 items-center self-start rounded-md border border-rule px-5"
      >
        {t('retry')}
      </button>
    </main>
  );
}
