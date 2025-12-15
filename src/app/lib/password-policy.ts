
import { z } from 'zod';
import crypto from 'crypto';

/**
 * Checks if a password has been exposed in a data breach using the Pwned Passwords API.
 * @param password The password to check.
 * @returns {Promise<boolean>} True if the password is pwned, false otherwise.
 */
async function isPasswordPwned(password: string): Promise<boolean> {
  try {
    const shasum = crypto.createHash('sha1');
    shasum.update(password);
    const hash = shasum.digest('hex').toUpperCase();
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!response.ok) {
        // If the API fails, we conservatively fail open (allow the password)
        // but log the error for monitoring.
        console.error(`Pwned Passwords API error: ${response.statusText}`);
        return false;
    }
    
    const text = await response.text();
    const hashes = text.split('\r\n');

    for (const h of hashes) {
      const [hashSuffix] = h.split(':');
      if (hashSuffix === suffix) {
        return true; // Password found in a breach
      }
    }
    
    return false; // Password not found
  } catch (error) {
    console.error("Failed to check Pwned Passwords API:", error);
    // Fail open if the check fails for any reason
    return false;
  }
}

export const passwordPolicy = z.string()
    .min(10, { message: "Password must be at least 10 characters long." })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter." })
    .regex(/[0-9]/, { message: "Password must contain at least one number." })
    .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character." })
    // Add the refinement for the Pwned Passwords check
    .superRefine(async (password, ctx) => {
        if (await isPasswordPwned(password)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "This password has appeared in a data breach. Please choose a different one.",
            });
        }
    });
