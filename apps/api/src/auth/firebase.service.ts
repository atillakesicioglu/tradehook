import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { loadConfig } from '../config/configuration';

// firebase-admin is imported lazily so the API can run in dev JWT mode without
// requiring valid Firebase credentials.
type FirebaseAdmin = typeof import('firebase-admin');

export interface FirebaseUser {
  uid: string;
  email: string;
  name?: string;
}

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private admin: FirebaseAdmin | null = null;
  private initialized = false;

  private async getAdmin(): Promise<FirebaseAdmin> {
    if (this.initialized && this.admin) return this.admin;

    const { firebase } = loadConfig();
    if (!firebase.projectId || !firebase.clientEmail || !firebase.privateKey) {
      throw new UnauthorizedException(
        'Firebase is not configured. Set FIREBASE_* env vars or keep DEV_MOCK_AUTH=true.',
      );
    }

    const admin = (await import('firebase-admin')) as FirebaseAdmin;
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebase.projectId,
          clientEmail: firebase.clientEmail,
          privateKey: firebase.privateKey,
        }),
      });
      this.logger.log('Firebase Admin initialized');
    }
    this.admin = admin;
    this.initialized = true;
    return admin;
  }

  async verifyIdToken(token: string): Promise<FirebaseUser> {
    const admin = await this.getAdmin();
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      if (!decoded.email) {
        throw new UnauthorizedException('Firebase token has no email');
      }
      return {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name as string | undefined,
      };
    } catch {
      throw new UnauthorizedException('Invalid Firebase ID token');
    }
  }
}
