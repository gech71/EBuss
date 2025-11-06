
'use server';

import nodemailer from 'nodemailer';

const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
};

const transporter = nodemailer.createTransport(smtpConfig);

const APP_NAME = "NibTeraBuss";
const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';

export async function sendCredentialsEmail(email: string, password: string): Promise<void> {
    const mailOptions = {
        from: `"${APP_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: email,
        subject: `Welcome to ${APP_NAME} - Your Account Credentials`,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Welcome to ${APP_NAME}!</h2>
                <p>An administrator account has been created for you. You can now manage your buses, routes, and bookings.</p>
                <p>Here are your login details:</p>
                <ul>
                    <li><strong>Username:</strong> ${email}</li>
                    <li><strong>Password:</strong> <code>${password}</code></li>
                </ul>
                <p>For security, we highly recommend that you change your password after your first login.</p>
                <p>
                    <a href="${APP_URL}/login" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Login to Your Account
                    </a>
                </p>
                <p>If you have any questions, please contact our support team.</p>
                <p>Thank you,<br/>The ${APP_NAME} Team</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Credentials email sent to ${email}`);
    } catch (error) {
        console.error(`Failed to send credentials email to ${email}:`, error);
        // In a production app, you might want to add more robust error handling,
        // like adding the email to a retry queue.
        throw new Error('Failed to send welcome email.');
    }
}
