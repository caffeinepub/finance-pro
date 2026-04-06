/**
 * WebAuthn-based biometric lock utility for Finance Pro.
 * All state is localStorage-only (per device, never synced to cloud).
 */

const BIOMETRIC_ENABLED_KEY = (userId: string) => `biometric_enabled_${userId}`;
const BIOMETRIC_CRED_KEY = (userId: string) => `biometric_cred_${userId}`;

export async function isBiometricSupported(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isBiometricEnabled(userId: string): boolean {
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY(userId)) === "true";
}

export function setBiometricEnabled(userId: string, enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(BIOMETRIC_ENABLED_KEY(userId), "true");
  } else {
    localStorage.removeItem(BIOMETRIC_ENABLED_KEY(userId));
  }
}

export async function registerBiometric(
  userId: string,
  username: string,
): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Finance Pro", id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(userId),
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
      },
    });

    if (!credential) return false;

    const pk = credential as PublicKeyCredential;
    const credIdBase64 = btoa(String.fromCharCode(...new Uint8Array(pk.rawId)));
    localStorage.setItem(BIOMETRIC_CRED_KEY(userId), credIdBase64);
    return true;
  } catch {
    return false;
  }
}

export async function verifyBiometric(userId: string): Promise<boolean> {
  try {
    const stored = localStorage.getItem(BIOMETRIC_CRED_KEY(userId));
    if (!stored) return false;

    const credId = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            id: credId,
            type: "public-key",
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    return assertion !== null;
  } catch {
    return false;
  }
}

export function clearBiometric(userId: string): void {
  localStorage.removeItem(BIOMETRIC_ENABLED_KEY(userId));
  localStorage.removeItem(BIOMETRIC_CRED_KEY(userId));
}
