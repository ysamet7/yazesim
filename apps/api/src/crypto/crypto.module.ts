import { Global, Module } from '@nestjs/common';
import { FieldCipher, KeyedHasher, parseFieldKeys, parsePepper } from '@yazesim/server';
import type { ApiEnv } from '@yazesim/shared/env';
import { API_ENV } from '../config/env.js';

/**
 * The field cipher for chat content and other personal data stored encrypted
 * (golden rule 7), and keyed hashing for values that are compared but never
 * stored in clear (e-mail, IP). Keys come from the validated environment once.
 */
@Global()
@Module({
  providers: [
    {
      provide: KeyedHasher,
      inject: [API_ENV],
      useFactory: (env: ApiEnv) => new KeyedHasher(parsePepper(env.HASH_PEPPER)),
    },
    {
      provide: FieldCipher,
      inject: [API_ENV],
      useFactory: (env: ApiEnv) =>
        new FieldCipher(
          parseFieldKeys(env.DATA_ENCRYPTION_KEYS),
          env.DATA_ENCRYPTION_ACTIVE_KEY_ID,
        ),
    },
  ],
  exports: [KeyedHasher, FieldCipher],
})
export class CryptoModule {}
