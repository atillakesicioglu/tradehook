import { Injectable } from '@nestjs/common';
import { createDecipheriv } from 'node:crypto';
import { loadWorkerConfig } from './config';

const ALGORITHM = 'aes-256-gcm';

/** Decrypts Binance credentials stored by the API (AES-256-GCM). */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor() {
    const { encryptionKey } = loadWorkerConfig();
    if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
      throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes).');
    }
    this.key = Buffer.from(encryptionKey, 'hex');
  }

  decrypt(payload: string): string {
    const [ivHex, authTagHex, dataHex] = payload.split(':');
    const decipher = createDecipheriv(
      ALGORITHM,
      this.key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
