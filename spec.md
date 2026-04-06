# Finance Pro

## Current State
Finance Pro is a fully functional PWA for lending/finance businesses. It has:
- Username/password login for all users (admin + agents)
- Settings page with General, Agents, and Lines sections
- All major features: Add Entry, Update EMI, Records, Reports, Dashboard
- Bilingual support (English/Tamil)
- Cloud-synced business data via Motoko backend

## Requested Changes (Diff)

### Add
- `BiometricLock` utility module (`src/utils/biometricLock.ts`) to handle WebAuthn registration, verification, and localStorage-based per-device state
- `BiometricLockScreen` component: full-screen overlay shown when app opens and biometric lock is enabled. Shows a fingerprint icon button to trigger biometric auth, a fallback "Use Password" link, and appropriate error/unsupported states.
- Settings > Security section (new tab/section): toggle to enable/disable fingerprint lock. Only visible if device supports WebAuthn biometrics. Shows "Not supported on this device" if not supported.
- Labels for fingerprint lock UI in both `en` and `ta` in `labels.ts`

### Modify
- `App.tsx`: On app mount, if biometric lock is enabled for the current device/user, show `BiometricLockScreen` before the main app. On successful biometric auth, proceed to normal app. On fallback, show normal login.
- `SettingsPage.tsx`: Add a new "Security" section with the biometric lock toggle.
- `store/types.ts`: No changes needed (biometric state is device-local only, not cloud-synced)
- `store/appStore.ts`: No changes needed (biometric state is device-local, stored in localStorage per user)

### Remove
- Nothing removed

## Implementation Plan

1. **`src/utils/biometricLock.ts`** -- WebAuthn utility:
   - `isBiometricSupported()`: checks `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()`
   - `isBiometricEnabled(userId)`: reads from localStorage key `biometric_enabled_{userId}`
   - `setBiometricEnabled(userId, enabled)`: writes to localStorage
   - `registerBiometric(userId, username)`: calls `navigator.credentials.create()` and stores the credential ID in localStorage `biometric_cred_{userId}`
   - `verifyBiometric(userId)`: calls `navigator.credentials.get()` with stored credential ID. Returns true on success, false on failure/cancel.
   - `clearBiometric(userId)`: removes all biometric keys from localStorage

2. **`src/components/BiometricLockScreen.tsx`** -- Lock screen component:
   - Full-screen overlay with app name/branding
   - Fingerprint icon button (auto-triggers biometric on mount)
   - Shows error message after failure
   - After 3 failures OR user taps "Use Password": calls `onFallback()` to revert to normal password login
   - "Unlock with Fingerprint" button to retry
   - Clean, branded UI consistent with existing app style

3. **`src/pages/SettingsPage.tsx`** -- Add Security section:
   - New `security` tab alongside general/agents/lines
   - Shows biometric toggle (Switch component)
   - If not supported: show grayed-out message "Not supported on this device"
   - On enable: calls `registerBiometric()`, stores credential
   - On disable: calls `clearBiometric()`, disables lock
   - Only affects the current device/user

4. **`src/App.tsx`** -- Guard logic:
   - On mount, check if `currentUser` is set in localStorage AND `isBiometricEnabled(userId)` is true
   - If yes, show `BiometricLockScreen` instead of main app
   - On successful auth: dismiss lock screen, show main app
   - On fallback: clear `currentUser` session (force re-login with password)

5. **`src/store/labels.ts`** -- Add new label keys:
   - `security`, `fingerprintLock`, `fingerprintLockDesc`, `enableFingerprint`, `fingerprintNotSupported`, `unlockWithFingerprint`, `usePassword`, `biometricFailed`, `biometricSuccess` -- in both `en` and `ta`
