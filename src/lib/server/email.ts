'use server';

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // use TLS
    auth: {
      user: process.env.SMTP_USER, // your Gmail address
      pass: process.env.SMTP_PASS, // your Gmail App Password
    },
});

export async function sendCredentialsEmail(to: string, username: string, password: string) {
  const mailOptions = {
    from: `"NibTeraBuss Support" <support@nibterabuss.com>`,
    to,
    subject: "Your NibTeraBuss Login Credentials",
    html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Welcome to NibTeraBuss!</h2>
                <p>An administrator account has been created for you. You can now manage your buses, routes, and bookings.</p>
                <p>Here are your login details:</p>
                <ul>
                    <li><strong>Username:</strong> ${username}</li>
                    <li><strong>Password:</strong> <code>${password}</code></li>
                </ul>
                <p>For security, we require that you change your password after your first login.</p>
                <p>
                    <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/login" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Login to Your Account
                    </a>
                </p>
                <p>If you have any questions, please contact our support team.</p>
                <p>Thank you,<br/>The NibTeraBuss Team</p>
            </div>
        `,
  };

  await transporter.sendMail(mailOptions);
}

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
