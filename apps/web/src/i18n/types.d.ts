import type messages from '../../messages/tr.json';

// Typed translation keys: a missing or misspelled key is a compile error.
declare module 'next-intl' {
  interface AppConfig {
    Locale: 'tr';
    Messages: typeof messages;
  }
}
