import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type GenerateRegistrationOptionsOpts,
  type GenerateAuthenticationOptionsOpts,
  type VerifyRegistrationResponseOpts,
  type VerifyAuthenticationResponseOpts,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

// Environment configuration
const RP_ID = process.env.WEBAUTHN_RP_ID || 'erp.metrica.hr';
const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'FiskAI';
const ORIGIN = process.env.NEXTAUTH_URL || 'https://erp.metrica.hr';

// Challenge storage with TTL (5 minutes)
interface ChallengeData {
  challenge: string;
  expiresAt: number;
}

const challengeStore = new Map<string, ChallengeData>();

// Clean up expired challenges every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of challengeStore.entries()) {
    if (value.expiresAt < now) {
      challengeStore.delete(key);
    }
  }
}, 60000);

export function storeChallenge(userId: string, challenge: string): void {
  challengeStore.set(userId, {
    challenge,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });
}

export function getChallenge(userId: string): string | null {
  const data = challengeStore.get(userId);
  if (!data) return null;
  if (data.expiresAt < Date.now()) {
    challengeStore.delete(userId);
    return null;
  }
  return data.challenge;
}

export function deleteChallenge(userId: string): void {
  challengeStore.delete(userId);
}

export interface RegisteredCredential {
  id: string;
  credentialId: string;
  publicKey: string;
  counter: bigint;
  transports?: string;
}

export async function generateWebAuthnRegistrationOptions(
  userId: string,
  userName: string,
  userDisplayName: string,
  existingCredentials: RegisteredCredential[]
) {
  const opts: GenerateRegistrationOptionsOpts = {
    rpName: RP_NAME,
    rpID: RP_ID,
    userName,
    userDisplayName,
    timeout: 60000,
    attestationType: 'none',
    excludeCredentials: existingCredentials.map((cred) => ({
      id: Buffer.from(cred.credentialId, 'base64'),
      type: 'public-key',
      transports: cred.transports
        ? (JSON.parse(cred.transports) as AuthenticatorTransport[])
        : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  };

  const options = await generateRegistrationOptions(opts);
  storeChallenge(userId, options.challenge);
  return options;
}

export async function verifyWebAuthnRegistration(
  userId: string,
  response: RegistrationResponseJSON
) {
  const expectedChallenge = getChallenge(userId);
  if (!expectedChallenge) {
    throw new Error('Challenge not found or expired');
  }

  const opts: VerifyRegistrationResponseOpts = {
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: false,
  };

  const verification = await verifyRegistrationResponse(opts);
  deleteChallenge(userId);

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Registration verification failed');
  }

  const { credentialPublicKey, credentialID, counter } =
    verification.registrationInfo;

  return {
    credentialId: Buffer.from(credentialID).toString('base64'),
    publicKey: Buffer.from(credentialPublicKey).toString('base64'),
    counter: BigInt(counter),
  };
}

export async function generateWebAuthnAuthenticationOptions(
  userId: string,
  credentials: RegisteredCredential[]
) {
  const opts: GenerateAuthenticationOptionsOpts = {
    timeout: 60000,
    allowCredentials: credentials.map((cred) => ({
      id: Buffer.from(cred.credentialId, 'base64'),
      type: 'public-key',
      transports: cred.transports
        ? (JSON.parse(cred.transports) as AuthenticatorTransport[])
        : undefined,
    })),
    userVerification: 'preferred',
    rpID: RP_ID,
  };

  const options = await generateAuthenticationOptions(opts);
  storeChallenge(userId, options.challenge);
  return options;
}

export async function verifyWebAuthnAuthentication(
  userId: string,
  response: AuthenticationResponseJSON,
  credential: RegisteredCredential
) {
  const expectedChallenge = getChallenge(userId);
  if (!expectedChallenge) {
    throw new Error('Challenge not found or expired');
  }

  const opts: VerifyAuthenticationResponseOpts = {
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    authenticator: {
      credentialID: Buffer.from(credential.credentialId, 'base64'),
      credentialPublicKey: Buffer.from(credential.publicKey, 'base64'),
      counter: Number(credential.counter),
    },
    requireUserVerification: false,
  };

  const verification = await verifyAuthenticationResponse(opts);
  deleteChallenge(userId);

  if (!verification.verified) {
    throw new Error('Authentication verification failed');
  }

  return {
    verified: true,
    newCounter: BigInt(verification.authenticationInfo.newCounter),
  };
}
