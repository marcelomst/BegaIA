import nodemailer from 'nodemailer';
import { config } from '../config';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }

  async sendEmail(to: string, subject: string, text: string, html?: string) {
    try {
      const mailOptions = {
        from: config.email.from,
        to,
        subject,
        text,
        html: html || text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email enviado:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error al enviar email:', error);
      throw error;
    }
  }

  async sendEmailWithAttachment(to: string, subject: string, text: string, attachments: any[]) {
    try {
      const mailOptions = {
        from: config.email.from,
        to,
        subject,
        text,
        attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email con adjuntos enviado:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error al enviar email con adjuntos:', error);
      throw error;
    }
  }
} 