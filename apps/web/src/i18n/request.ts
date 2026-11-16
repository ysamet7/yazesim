import { getRequestConfig } from 'next-intl/server';
import messages from '../../messages/tr.json';

/** The only language of the first release; every user-visible text is in messages/tr.json. */
export const LOCALE = 'tr';

export default getRequestConfig(() =>
  Promise.resolve({
    locale: LOCALE,
    messages,
    timeZone: 'Europe/Istanbul',
  }),
);
