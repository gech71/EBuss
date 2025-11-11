
'use server';

import nodemailer from 'nodemailer';

export async function sendCredentialsEmail(to: string, username: string, password: string) {
  // Switched to Mailtrap for development.
  // In production, you would use a service like SendGrid, Postmark, or AWS SES.
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // use TLS
    auth: {
      user: process.env.SMTP_USER, // your Gmail address
      pass: process.env.SMTP_PASS, // your Gmail App Password
    },
  });

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
