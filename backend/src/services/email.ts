import nodemailer from "nodemailer";

function getTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const appUrl = process.env.APP_URL || "http://18.215.169.165";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"StudioFlow" <${process.env.MAIL_USER}>`,
    to,
    subject: "Redefinição de senha — StudioFlow",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fafaf9; border-radius: 16px;">
        <h1 style="font-size: 24px; color: #1a1a1a; margin-bottom: 8px;">Redefinir sua senha</h1>
        <p style="color: #666; font-size: 15px; margin-bottom: 24px;">
          Olá, <strong>${name}</strong>! Recebemos uma solicitação para redefinir a senha da sua conta no StudioFlow.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #7c3aed; color: white; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 15px;">
          Redefinir senha
        </a>
        <p style="color: #999; font-size: 13px; margin-top: 24px;">
          Este link expira em <strong>1 hora</strong>. Se você não solicitou a redefinição, ignore este e-mail.
        </p>
      </div>
    `,
  });
}
