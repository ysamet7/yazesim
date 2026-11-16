import { getTranslations } from 'next-intl/server';

const SECTIONS = ['experts', 'literature', 'simulations'] as const;

/** Phase 0 placeholder: what YazeSim will be, set as plain, well-spaced type. */
export default async function HomePage() {
  const t = await getTranslations('home');
  const brand = await getTranslations('brand');

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-6 pt-[max(env(safe-area-inset-top),2.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)] sm:px-10">
      <header className="flex items-baseline justify-between gap-4">
        <span className="font-serif text-xl tracking-tight">{brand('name')}</span>
        <span className="text-sm text-ink-muted">{t('status')}</span>
      </header>

      <main className="flex flex-1 flex-col justify-center py-16 sm:py-24">
        <h1 className="font-serif text-[2.5rem] leading-[1.08] tracking-tight text-balance sm:text-6xl">
          {t('title')}
        </h1>
        <p className="mt-6 max-w-[36rem] text-lg leading-relaxed text-pretty text-ink-muted">
          {t('lead')}
        </p>

        <section aria-labelledby="sections-label" className="mt-14">
          <h2
            id="sections-label"
            className="text-xs font-medium tracking-[0.14em] text-ink-muted uppercase"
          >
            {t('sectionsLabel')}
          </h2>
          <dl className="mt-4 border-t border-rule">
            {SECTIONS.map((key) => (
              <div
                key={key}
                className="grid gap-1 border-b border-rule py-5 sm:grid-cols-[10rem_1fr] sm:gap-8"
              >
                <dt className="font-serif text-lg">{t(`sections.${key}.title`)}</dt>
                <dd className="leading-relaxed text-ink-muted">{t(`sections.${key}.body`)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="mt-10 max-w-[36rem] leading-relaxed">
          <span aria-hidden="true" className="mr-2 font-serif text-accent">
            —
          </span>
          {t('payment')}
        </p>
      </main>

      <footer className="text-sm text-ink-muted">{brand('family')}</footer>
    </div>
  );
}
