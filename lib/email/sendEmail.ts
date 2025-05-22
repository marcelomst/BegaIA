// /lib/email/sendEmail.ts
import nodemailer from "nodemailer";

type SMTPConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure?: boolean;
};

export async function sendEmail(
  smtp: SMTPConfig,
  to: string,
  subject: string,
  html: string
) {
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure ?? false,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  await transporter.sendMail({
    from: `"Hotel Assistant" <${smtp.user}>`,
    to,
    subject,
    html,
  });
}
