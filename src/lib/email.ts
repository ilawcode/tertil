import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
    try {
        const mailOptions = {
            from: `Tertil <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error };
    }
}

export function getProgramApprovedEmail(programTitle: string, userName: string, locale: string = 'tr') {
    const translations = {
        tr: {
            subject: 'Programınız Onaylandı - Tertil',
            greeting: `Merhaba ${userName}`,
            message: `"${programTitle}" başlıklı programınız admin tarafından onaylandı ve artık diğer kullanıcılar tarafından görüntülenebilir.`,
            cta: 'Programı Görüntüle',
            thanks: 'Tertil\'i tercih ettiğiniz için teşekkür ederiz.',
        },
        en: {
            subject: 'Your Program Has Been Approved - Tertil',
            greeting: `Hello ${userName}`,
            message: `Your program "${programTitle}" has been approved by admin and is now visible to other users.`,
            cta: 'View Program',
            thanks: 'Thank you for choosing Tertil.',
        },
    };

    const t = translations[locale as keyof typeof translations] || translations.tr;

    return {
        subject: t.subject,
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
          <div style="padding: 40px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <h1 style="color: white; margin: 0; font-size: 28px;">✓ ${locale === 'tr' ? 'Onaylandı' : 'Approved'}</h1>
          </div>
          <div style="padding: 40px; color: #e2e8f0;">
            <h2 style="color: #f1f5f9; margin-top: 0;">${t.greeting},</h2>
            <p style="font-size: 16px; line-height: 1.6;">${t.message}</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">${t.cta}</a>
            </div>
            <p style="color: #94a3b8; font-size: 14px;">${t.thanks}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    };
}

export function getProgramCompletedEmail(programTitle: string, userName: string, locale: string = 'tr') {
    const translations = {
        tr: {
            subject: 'Program Tamamlandı - Tertil',
            greeting: `Merhaba ${userName}`,
            message: `"${programTitle}" başlıklı program tamamlandı! Tüm katılımcılar okumalarını bitirdi.`,
            cta: 'Detayları Görüntüle',
            thanks: 'Hayırlı olsun!',
        },
        en: {
            subject: 'Program Completed - Tertil',
            greeting: `Hello ${userName}`,
            message: `The program "${programTitle}" has been completed! All participants have finished their readings.`,
            cta: 'View Details',
            thanks: 'Congratulations!',
        },
    };

    const t = translations[locale as keyof typeof translations] || translations.tr;

    return {
        subject: t.subject,
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
          <div style="padding: 40px; text-align: center; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 ${locale === 'tr' ? 'Tamamlandı' : 'Completed'}</h1>
          </div>
          <div style="padding: 40px; color: #e2e8f0;">
            <h2 style="color: #f1f5f9; margin-top: 0;">${t.greeting},</h2>
            <p style="font-size: 16px; line-height: 1.6;">${t.message}</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">${t.cta}</a>
            </div>
            <p style="color: #94a3b8; font-size: 14px;">${t.thanks}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    };
}

export function getReminderEmail(programTitle: string, userName: string, daysLeft: number, locale: string = 'tr') {
    const translations = {
        tr: {
            subject: 'Program Hatırlatması - Tertil',
            greeting: `Merhaba ${userName}`,
            message: `"${programTitle}" programının bitimine ${daysLeft} gün kaldı. Lütfen okumalarınızı tamamlamayı unutmayın.`,
            cta: 'Programı Görüntüle',
            thanks: 'İyi okumalar!',
        },
        en: {
            subject: 'Program Reminder - Tertil',
            greeting: `Hello ${userName}`,
            message: `There are ${daysLeft} days left until the "${programTitle}" program ends. Please don't forget to complete your readings.`,
            cta: 'View Program',
            thanks: 'Happy reading!',
        },
    };

    const t = translations[locale as keyof typeof translations] || translations.tr;

    return {
        subject: t.subject,
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
          <div style="padding: 40px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
            <h1 style="color: white; margin: 0; font-size: 28px;">⏰ ${locale === 'tr' ? 'Hatırlatma' : 'Reminder'}</h1>
          </div>
          <div style="padding: 40px; color: #e2e8f0;">
            <h2 style="color: #f1f5f9; margin-top: 0;">${t.greeting},</h2>
            <p style="font-size: 16px; line-height: 1.6;">${t.message}</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">${t.cta}</a>
            </div>
            <p style="color: #94a3b8; font-size: 14px;">${t.thanks}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    };
}
