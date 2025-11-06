
'use server';

import nodemailer from 'nodemailer';

export async function sendCredentialsEmail(to: string, username: string, password: string) {
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
    from: `"EBuss Support" <${process.env.SMTP_USER}>`,
    to,
    subject: "Your EBuss Login Credentials",
    html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Welcome to EBuss!</h2>
                <p>An administrator account has been created for you. You can now manage your buses, routes, and bookings.</p>
                <p>Here are your login details:</p>
                <ul>
                    <li><strong>Username:</strong> ${username}</li>
                    <li><strong>Password:</strong> <code>${password}</code></li>
                </ul>
                <p>For security, we highly recommend that you change your password after your first login.</p>
                <p>
                    <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/login" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Login to Your Account
                    </a>
                </p>
                <p>If you have any questions, please contact our support team.</p>
                <p>Thank you,<br/>The EBuss Team</p>
            </div>
        `,
  };

  await transporter.sendMail(mailOptions);
}
