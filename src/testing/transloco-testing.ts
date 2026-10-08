import { TranslocoTestingModule } from '@jsverse/transloco';

import enGB from '../../public/i18n/en-GB.json';
import { DEFAULT_LANG } from '../app/core/i18n/i18n';

/** Real en-GB translations, preloaded, for specs that render or assert on UI text. */
export function translocoTesting() {
  return TranslocoTestingModule.forRoot({
    langs: { [DEFAULT_LANG]: enGB },
    translocoConfig: { availableLangs: [DEFAULT_LANG], defaultLang: DEFAULT_LANG },
    preloadLangs: true,
  });
}
