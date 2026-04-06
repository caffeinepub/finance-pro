import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { verifyBiometric } from "../utils/biometricLock";

interface Props {
  onUnlocked: () => void;
  onFallback: () => void;
  username: string;
  userId: string;
  language?: "en" | "ta";
}

const FingerprintIcon = () => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-20 h-20"
    aria-hidden="true"
  >
    <circle
      cx="32"
      cy="32"
      r="30"
      stroke="currentColor"
      strokeWidth="2"
      opacity="0.15"
    />
    <path
      d="M32 14c-9.94 0-18 8.06-18 18"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M14 32c0 9.94 8.06 18 18 18"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M50 32c0-9.94-8.06-18-18-18"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M32 20c-6.63 0-12 5.37-12 12"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M20 32c0 6.63 5.37 12 12 12"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M44 32c0-6.63-5.37-12-12-12"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M32 26c-3.31 0-6 2.69-6 6"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M26 32c0 3.31 2.69 6 6 6"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M38 32c0-3.31-2.69-6-6-6"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="32" cy="32" r="2" fill="currentColor" />
  </svg>
);

export default function BiometricLockScreen({
  onUnlocked,
  onFallback,
  username,
  userId,
  language = "en",
}: Props) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failCount, setFailCount] = useState(0);
  const hasAutoTriggered = useRef(false);
  const isVerifyingRef = useRef(false);

  const isTA = language === "ta";

  const triggerVerify = useCallback(async () => {
    if (isVerifyingRef.current) return;
    isVerifyingRef.current = true;
    setIsVerifying(true);
    setError(null);

    const success = await verifyBiometric(userId);

    isVerifyingRef.current = false;
    setIsVerifying(false);

    if (success) {
      onUnlocked();
    } else {
      setFailCount((prev) => prev + 1);
      setError(
        isTA
          ? "கைரேகை அங்கீகரிக்கப்படவில்லை. மீண்டும் முயற்சிக்கவும்."
          : "Fingerprint not recognized. Try again.",
      );
    }
  }, [userId, isTA, onUnlocked]);

  // Auto-trigger on mount with small delay
  useEffect(() => {
    if (hasAutoTriggered.current) return;
    hasAutoTriggered.current = true;
    const timer = setTimeout(() => {
      triggerVerify();
    }, 500);
    return () => clearTimeout(timer);
  }, [triggerVerify]);

  const showFallback = failCount >= 3;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, oklch(15% 0.02 250) 0%, oklch(10% 0.03 270) 100%)",
      }}
      data-ocid="biometric.modal"
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-6 px-8 max-w-sm w-full"
      >
        {/* App name */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Finance Pro
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(70% 0.05 250)" }}>
            {isTA ? "பாதுகாக்கப்பட்ட அணுகல்" : "Secured Access"}
          </p>
        </div>

        {/* Fingerprint icon button */}
        <motion.button
          type="button"
          onClick={triggerVerify}
          disabled={isVerifying}
          className="relative flex items-center justify-center rounded-full transition-all focus:outline-none"
          style={{
            width: 120,
            height: 120,
            background: isVerifying
              ? "oklch(30% 0.08 250)"
              : "oklch(25% 0.06 250)",
            border: "2px solid",
            borderColor: error ? "oklch(55% 0.2 25)" : "oklch(50% 0.15 250)",
            color: error ? "oklch(65% 0.18 25)" : "oklch(75% 0.12 250)",
            boxShadow: isVerifying
              ? "0 0 30px oklch(50% 0.15 250 / 0.4)"
              : "0 0 0px transparent",
          }}
          animate={isVerifying ? { scale: [1, 1.05, 1] } : {}}
          transition={{
            repeat: isVerifying ? Number.POSITIVE_INFINITY : 0,
            duration: 1.2,
          }}
          whileTap={{ scale: 0.95 }}
          data-ocid="biometric.unlock_button"
        >
          <FingerprintIcon />
          {isVerifying && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: "2px solid oklch(65% 0.15 250)" }}
              animate={{ opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
            />
          )}
        </motion.button>

        {/* Status text */}
        <div className="text-center min-h-[48px]">
          {isVerifying ? (
            <p className="text-sm" style={{ color: "oklch(70% 0.08 250)" }}>
              {isTA ? "சரிபார்க்கிறது..." : "Verifying..."}
            </p>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <p
                className="text-sm font-medium"
                style={{ color: "oklch(65% 0.18 25)" }}
                data-ocid="biometric.error_state"
              >
                {error}
              </p>
              {!showFallback && (
                <button
                  type="button"
                  onClick={triggerVerify}
                  className="text-sm underline transition-opacity hover:opacity-80"
                  style={{ color: "oklch(70% 0.1 250)" }}
                  data-ocid="biometric.retry_button"
                >
                  {isTA ? "மீண்டும் முயற்சி" : "Try again"}
                </button>
              )}
            </motion.div>
          ) : (
            <p className="text-sm" style={{ color: "oklch(60% 0.05 250)" }}>
              {isTA ? "கைரேகை வைத்து திறக்கவும்" : "Tap to unlock"}
            </p>
          )}
        </div>

        {/* Username display */}
        <p className="text-xs" style={{ color: "oklch(50% 0.04 250)" }}>
          {username}
        </p>

        {/* Fallback buttons */}
        <div className="flex flex-col items-center gap-2 w-full">
          {showFallback && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={onFallback}
              className="w-full py-3 px-6 rounded-xl font-medium text-sm transition-all hover:opacity-90 active:scale-95"
              style={{
                background: "oklch(55% 0.18 250)",
                color: "white",
              }}
              data-ocid="biometric.use_password_button"
            >
              {isTA ? "கடவுச்சொல் பயன்படுத்தவும்" : "Use Password Instead"}
            </motion.button>
          )}
          {!showFallback && (
            <button
              type="button"
              onClick={onFallback}
              className="text-xs underline transition-opacity hover:opacity-70"
              style={{ color: "oklch(45% 0.04 250)" }}
              data-ocid="biometric.fallback_link"
            >
              {isTA ? "கடவுச்சொல் பயன்படுத்தவும்" : "Use Password Instead"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
