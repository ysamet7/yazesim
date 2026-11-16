import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 sm:px-10">
      <h1 className="font-serif text-4xl tracking-tight">{t('title')}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-muted">{t('body')}</p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center self-start text-accent underline underline-offset-4"
      >
        {t('home')}
      </Link>
    </main>
  );
}
