'use server';

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST?.replace(/"/g, ''),
    port: process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT) : 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    },
    tls: {
      // do not fail on invalid certs
      rejectUnauthorized: process.env.MAIL_ALLOW_SELF_SIGNED !== 'true'
    }
});

const FROM_EMAIL = `"NibTeraBuss Support" <${process.env.MAIL_FROM_EMAIL || 'no-reply@nibbank.com.et'}>`;

export async function sendPasswordSetupEmail(to: string, token: string) {
    const setupLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/setup-password/${token}`;
    
    const mailOptions = {
        from: FROM_EMAIL,
        to,
        subject: "Set Up Your NibTeraBuss Account Password",
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Welcome to NibTeraBuss!</h2>
                <p>An administrator account has been created for you. To get started, you need to set up a password.</p>
                <p>Please click the link below to create your password. This link is valid for <strong>1 hour</strong>.</p>
                <p>
                    <a href="${setupLink}" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Set Up Your Password
                    </a>
                </p>
                <p>If you did not request this, please ignore this email.</p>
                <p>Thank you,<br/>The NibTeraBuss Team</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
}

export async function sendPasswordResetEmail(to: string, token: string) {
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/reset-password/${token}`;
    
    const mailOptions = {
        from: FROM_EMAIL,
        to,
        subject: "Reset Your NibTeraBuss Account Password",
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a1a1a;">Password Reset Request</h2>
                <p>We received a request to reset the password for your NibTeraBuss account.</p>
                <p>Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #3B82F6; color: white; padding: 12px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Reset Your Password
                    </a>
                </p>
                <p style="color: #666; font-size: 14px;">If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="color: #999; font-size: 12px;">For security reasons, this link will expire in 1 hour. If you need a new link, please visit the login page and click "Forgot Password" again.</p>
                <p>Thank you,<br/>The NibTeraBuss Team</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
}
