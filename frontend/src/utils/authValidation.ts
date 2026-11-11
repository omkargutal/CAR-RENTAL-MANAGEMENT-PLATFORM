/**
 * Standardized Authentication Validation Rules and Error Formatting
 * Enforces field-specific, clear, user-friendly messages specified by Swaraj Tours & Travel.
 */

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export function validateEmail(email: string): ValidationResult {
  if (!email || !email.trim()) {
    return { isValid: false, message: "Please enter your email address." };
  }
  // Standard RFC 5322 compliant email regex check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, message: "Enter a valid email address." };
  }
  return { isValid: true };
}

export function validatePassword(password: string, isRegistration = false): ValidationResult {
  if (!password) {
    return { isValid: false, message: "Please enter your password." };
  }
  if (isRegistration && password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters." };
  }
  return { isValid: true };
}

export function validateName(name: string, fieldLabel: "first name" | "last name"): ValidationResult {
  if (!name || !name.trim()) {
    return {
      isValid: false,
      message: fieldLabel === "first name" ? "Please enter your first name." : "Please enter your last name.",
    };
  }
  return { isValid: true };
}

export function validatePhoneNumber(phone?: string): ValidationResult {
  if (!phone || !phone.trim()) {
    // Phone number is optional per business requirements
    return { isValid: true };
  }
  const cleaned = phone.replace(/[\s-]/g, "");
  // Accept standard 10-digit Indian numbers or E.164 international numbers
  const phoneRegex = /^(?:\+?[1-9]\d{9,14}|[6-9]\d{9})$/;
  if (!phoneRegex.test(cleaned)) {
    return { isValid: false, message: "Enter a valid phone number." };
  }
  return { isValid: true };
}

export function validatePasswordMatch(pw: string, confirmPw: string): ValidationResult {
  if (pw !== confirmPw) {
    return { isValid: false, message: "Passwords do not match." };
  }
  return { isValid: true };
}

/**
 * Maps raw backend/network errors to user-friendly messages without exposing internal stack traces.
 */
export function formatAuthError(error: unknown, fallbackMessage = "Unable to complete request. Please try again."): string {
  if (!error) return fallbackMessage;

  const rawMessage = (error instanceof Error ? error.message : String(error)).toLowerCase();

  // Network / Connection errors
  if (
    rawMessage.includes("network") ||
    rawMessage.includes("failed to fetch") ||
    rawMessage.includes("connection refused") ||
    rawMessage.includes("offline") ||
    rawMessage.includes("timeout")
  ) {
    return "Unable to connect. Check your internet connection.";
  }

  // Rate limiting / lockout
  if (rawMessage.includes("locked") || rawMessage.includes("too many") || rawMessage.includes("rate limit")) {
    return "Too many login attempts. Please try again later.";
  }

  // Account inactive / disabled
  if (rawMessage.includes("inactive") || rawMessage.includes("disabled")) {
    return "Your account is currently inactive. Please contact support.";
  }

  // Unverified account
  if (rawMessage.includes("not verified") || rawMessage.includes("unverified")) {
    return "Please verify your email to continue.";
  }

  // Credentials mismatch
  if (
    rawMessage.includes("incorrect email or password") ||
    rawMessage.includes("invalid credentials") ||
    rawMessage.includes("unauthorized")
  ) {
    return "Incorrect email or password.";
  }

  // Duplicate email / Existing account
  if (rawMessage.includes("already registered") || rawMessage.includes("already exists") || rawMessage.includes("conflict")) {
    return "An account with this email already exists.";
  }

  // Password reset token expired / invalid
  if (rawMessage.includes("invalid or expired password reset token") || rawMessage.includes("reset token")) {
    return "Invalid or expired reset token. Please request a new password reset.";
  }

  // Email verification token expired
  if (rawMessage.includes("email verification token") || rawMessage.includes("token not found")) {
    return "Invalid or expired verification link. Please request a new verification.";
  }

  // Clean uppercase/lowercase display if already a clean sentence
  if (error instanceof Error && error.message && !error.message.includes("{") && error.message.length < 80) {
    return error.message;
  }

  return fallbackMessage;
}
