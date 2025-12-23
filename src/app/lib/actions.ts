"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import bcrypt from "bcrypt";
import { createSession, deleteSession } from "@/app/lib/auth";
import { validateRequest } from "@/lib/server/auth";
import type { ActionResult } from "next/dist/server/app-render/types";
import { z } from "zod";
import { logAction } from "./logger";
import { getIP } from "./get-ip";
import { passwordPolicy } from "./password-policy";
import crypto from "crypto";

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW_SECONDS = 60;

export async function validateCsrf(
  tokenFromRequest: string | FormData | undefined
) {
  if (tokenFromRequest === undefined) {
    await logAction({
      actionType: "CSRF_VALIDATION_FAIL",
      description: "CSRF token was missing from the request.",
    });
    throw new Error("Invalid CSRF token.");
  }

  const cookieStore = await cookies();
  const tokenFromCookie = cookieStore.get("csrf_token")?.value;

  let token: string | null;

  if (tokenFromRequest instanceof FormData) {
    token = tokenFromRequest.get("csrfToken") as string | null;
  } else {
    token = tokenFromRequest;
  }

  if (!token || !tokenFromCookie || token !== tokenFromCookie) {
    await logAction({
      actionType: "CSRF_VALIDATION_FAIL",
      description: "Invalid CSRF token received.",
    });
    throw new Error("Invalid CSRF token.");
  }
}

export async function authenticate(
  prevState: any,
  formData: FormData
): Promise<{ message: string; success: boolean } | undefined> {
  const ip = await getIP();
  const email = formData.get("email") as string;

  if (ip) {
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - LOGIN_ATTEMPT_WINDOW_SECONDS * 1000
    );

    const attempts = await prisma.loginAttempt.findMany({
      where: {
        ipAddress: ip,
        timestamp: { gte: windowStart },
      },
      orderBy: { timestamp: "asc" },
    });

    if (attempts.length >= MAX_LOGIN_ATTEMPTS) {
      const firstAttemptTime = attempts[0].timestamp.getTime();
      const timeLeft = Math.ceil(
        (firstAttemptTime +
          LOGIN_ATTEMPT_WINDOW_SECONDS * 1000 -
          now.getTime()) /
          1000
      );
      await logAction({
        ipAddress: ip,
        actionType: "LOGIN_RATE_LIMIT",
        description: `Rate limit exceeded for login attempts from IP: ${ip}`,
      });
      return {
        message: `Too many login attempts. Please try again in ${timeLeft} seconds.`,
        success: false,
      };
    }
  }

  try {
    await validateCsrf(formData.get("csrfToken") as string);

    const password = formData.get("password") as string;

    if (!email || !password) {
      return { message: "Please provide all fields.", success: false };
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!existingUser) {
      if (ip) {
        await prisma.loginAttempt.create({ data: { ipAddress: ip } });
      }
      await logAction({
        ipAddress: ip,
        actionType: "LOGIN_FAIL",
        description: `Failed login attempt for email "${email}". Reason: User not found.`,
      });
      return { message: "Invalid email or password.", success: false };
    }
    
    // Check if the user needs to set up their password first
    if (!existingUser.hashed_password && existingUser.passwordSetupToken) {
       await logAction({
        ipAddress: ip,
        actionType: "LOGIN_FAIL",
        description: `Login attempt for "${email}" failed. Reason: Password not set.`,
      });
      return { message: "Your account setup is not complete. Please check your email for a password setup link.", success: false };
    }
    
    if (!existingUser.hashed_password) {
        // This case should ideally not be hit if the setup flow is followed.
         await logAction({
            ipAddress: ip,
            actionType: "LOGIN_FAIL",
            description: `Login attempt for "${email}" failed. Reason: Account has no password.`,
        });
        return { message: "Invalid account configuration. Please contact support.", success: false };
    }


    const validPassword = await bcrypt.compare(
      password,
      existingUser.hashed_password
    );

    if (!validPassword) {
      if (ip) {
        await prisma.loginAttempt.create({ data: { ipAddress: ip } });
      }
      await logAction({
        userId: existingUser.id,
        ipAddress: ip,
        actionType: "LOGIN_FAIL",
        description: `Failed login attempt for email "${email}". Reason: Invalid password.`,
      });
      return { message: "Invalid email or password.", success: false };
    }

    // Create session, including the password change flag
    await createSession(existingUser.id, existingUser.passwordChangeRequired);
    await logAction({
      userId: existingUser.id,
      ipAddress: ip,
      actionType: "LOGIN_SUCCESS",
      description: `Successful login for user ${existingUser.id} ("${email}").`,
    });

    if (existingUser.passwordChangeRequired) {
      redirect("/force-password-change");
    }

    let redirectPath = "/";
    if (existingUser.role === "SUPER_ADMIN") {
      redirectPath = "/super-admin";
    } else if (existingUser.role === "ADMIN") {
      redirectPath = "/admin";
    }

    redirect(redirectPath);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("NEXT_REDIRECT")) {
        throw error;
      }
      if (error.message === "Invalid CSRF token.") {
        return {
          message:
            "Your session has expired or is invalid. Please refresh the page and try again.",
          success: false,
        };
      }
      return { message: error.message, success: false };
    }
    console.error(error);
    return { message: "An unexpected error occurred.", success: false };
  }
}

export async function logout(): Promise<ActionResult> {
  const { session, user } = await validateRequest();
  if (!session || !user) {
    return {
      error: "Unauthorized",
    };
  }

  await deleteSession(session.jti);
  await logAction({
    userId: user.id,
    actionType: "LOGOUT",
    description: `User ${user.id} logged out successfully.`,
  });

  // We no longer redirect from the server action. Client will handle navigation.
  return { success: true };
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: passwordPolicy,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(formData: FormData) {
  const { user, session } = await validateRequest();

  try {
    await validateCsrf(formData.get("csrfToken") as string);
  } catch (error) {
    return {
      success: false,
      message:
        "Your session has expired or is invalid. Please refresh the page and try again.",
    };
  }

  if (!user || !session) {
    await logAction({
      actionType: "CHANGE_PASSWORD_UNAUTHORIZED",
      description: "Unauthorized password change attempt.",
    });
    return { success: false, message: "Unauthorized" };
  }

  const validatedData = await changePasswordSchema.spa(
    Object.fromEntries(formData.entries())
  );

  if (!validatedData.success) {
    const messages = validatedData.error.errors
      .map((e) => {
        if (e.path.includes("newPassword")) {
          return `New Password: ${e.message}`;
        }
        return e.message;
      })
      .join("\n");
    return {
      success: false,
      message: messages,
    };
  }

  const { currentPassword, newPassword } = validatedData.data;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser || !dbUser.hashed_password) {
      return { success: false, message: "User not found." };
    }

    const validPassword = await bcrypt.compare(
      currentPassword,
      dbUser.hashed_password
    );

    if (!validPassword) {
      await logAction({
        userId: user.id,
        actionType: "CHANGE_PASSWORD_FAIL",
        description: "Incorrect current password provided.",
      });
      return { success: false, message: "Incorrect current password." };
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        hashed_password: newHashedPassword,
        passwordChangeRequired: false, // Set the flag to false
      },
    });

    // Invalidate the current session, forcing a re-login for security.
    await deleteSession(session.jti);
    await logAction({
      userId: user.id,
      actionType: "CHANGE_PASSWORD_SUCCESS",
      description: "Password changed successfully, user logged out.",
    });

    return {
      success: true,
      message: "Password updated successfully. Please log in again.",
    };
  } catch (error) {
    await logAction({
      userId: user.id,
      actionType: "CHANGE_PASSWORD_FAIL",
      description: `Error changing password. Error: ${
        error instanceof Error ? error.message : "Unknown"
      }`,
    });
    return { success: false, message: "An unexpected error occurred." };
  }
}

const setupPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordPolicy,
});

export async function setupPasswordAction(formData: FormData) {
  try {
    await validateCsrf(formData);
  } catch (error) {
    return { success: false, message: 'Your session is invalid. Please refresh the page and try again.' };
  }

  const validatedData = await setupPasswordSchema.spa(Object.fromEntries(formData.entries()));

  if (!validatedData.success) {
    const messages = validatedData.error.errors.map(e => e.message).join('\n');
    return { success: false, message: messages };
  }

  const { token, password } = validatedData.data;

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await prisma.user.findUnique({
      where: { passwordSetupToken: hashedToken },
    });

    if (!user || !user.passwordSetupExpires || new Date() > user.passwordSetupExpires) {
      await logAction({ actionType: 'SETUP_PASSWORD_FAIL', description: 'Invalid or expired setup token used.' });
      return { success: false, message: 'This setup link is invalid or has expired. Please contact an administrator.' };
    }

    const newHashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        hashed_password: newHashedPassword,
        passwordSetupToken: null,
        passwordSetupExpires: null,
        passwordChangeRequired: false,
      },
    });

    await logAction({ userId: user.id, actionType: 'SETUP_PASSWORD_SUCCESS', description: 'User successfully set up their password.' });

    // Automatically log the user in
    await createSession(user.id, false);
    
    return { success: true };

  } catch (error) {
    await logAction({ actionType: 'SETUP_PASSWORD_FAIL', description: `An unexpected error occurred during password setup. Error: ${error instanceof Error ? error.message : 'Unknown'}` });
    return { success: false, message: 'An unexpected error occurred. Please try again.' };
  }
}
