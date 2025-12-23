
'use server';

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
});

export async function sendPasswordSetupEmail(to: string, token: string) {
    const setupLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/setup-password/${token}`;
    
    const mailOptions = {
        from: `"NibTeraBuss Support" <support@nibterabuss.com>`,
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
