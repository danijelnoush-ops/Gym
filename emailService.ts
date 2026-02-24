import nodemailer from 'nodemailer';
import { emailConfig } from '../config/email';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter;

  constructor() {
    // Inicijalizacija nodemailer transportera sa Gmail podešavanjima
    this.transporter = nodemailer.createTransport({
      service: emailConfig.service,
      auth: {
        user: emailConfig.auth.user,
        pass: emailConfig.auth.pass
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: emailConfig.auth.user,
        to: options.to,
        subject: options.subject,
        html: options.html
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email poslat:', info.messageId);
      return true;
    } catch (error) {
      console.error('Greška pri slanju emaila:', error);
      return false;
    }
  }

  async sendMembershipExpiryReminder(
    clientEmail: string,
    clientName: string,
    expiryDate: Date
  ): Promise<boolean> {
    const formattedDate = expiryDate.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1a1a1a; color: #ffffff; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #39ff14; font-size: 24px; margin: 0;">🏋️ GYM PRO</h1>
          <p style="color: #888; margin: 5px 0 0;">Vaš fitness partner</p>
        </div>
        
        <div style="background-color: #2a2a2a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #39ff14; margin: 0 0 15px 0;">Poštovani ${clientName},</h2>
          <p style="color: #ddd; line-height: 1.6; margin: 0 0 15px 0;">
            Želimo da Vas podsetimo da Vaša članarina ističe za 5 dana.
          </p>
          
          <div style="background-color: #333; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0;">
            <p style="color: #888; margin: 0 0 5px 0;">Datum isteka članarine:</p>
            <p style="color: #39ff14; font-size: 20px; font-weight: bold; margin: 0;">${formattedDate}</p>
          </div>
          
          <p style="color: #ddd; line-height: 1.6; margin: 0 0 15px 0;">
            Kako biste nastavili da koristite naše usluge bez prekida, molimo Vas da produžite članarinu.
          </p>
        </div>
        
        <div style="background-color: #2a2a2a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #39ff14; margin: 0 0 15px 0;">Naši paketi:</h3>
          
          <div style="margin-bottom: 15px;">
            <p style="color: #39ff14; margin: 0; font-weight: bold;">🔥 Promo paket</p>
            <p style="color: #ddd; margin: 5px 0;">Kontaktirajte nas za cenu</p>
          </div>
          
          <div style="margin-bottom: 15px;">
            <p style="color: #39ff14; margin: 0; font-weight: bold;">💪 Basic paket</p>
            <p style="color: #ddd; margin: 5px 0;">Kontaktirajte nas za cenu</p>
          </div>
          
          <div style="margin-bottom: 15px;">
            <p style="color: #39ff14; margin: 0; font-weight: bold;">👑 Premium paket</p>
            <p style="color: #ddd; margin: 5px 0;">Kontaktirajte nas za cenu</p>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; background-color: #2a2a2a; border-radius: 8px;">
          <p style="color: #ddd; margin: 0 0 10px 0;">
            Hvala Vam što koristite naše usluge! Vaše poverenje nam puno znači.
          </p>
          <p style="color: #39ff14; margin: 0; font-style: italic;">
            Vaš GYM PRO tim
          </p>
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 5px 0;">© 2024 GYM PRO. Sva prava zadržana.</p>
          <p style="margin: 5px 0;">Radno vreme: Utorak - Nedelja 08:00 - 20:00</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: clientEmail,
      subject: '🔔 Podsetnik - Vaša članarina uskoro ističe',
      html
    });
  }
}

export const emailService = new EmailService();