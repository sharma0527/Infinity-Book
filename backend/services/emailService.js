const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    pool: true, // Enables connection pooling
    maxConnections: 5, // Maximum number of connections to make
    maxMessages: 100, // Maximum number of messages to send per connection
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const getSenderEmail = () => {
    return process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || "no-reply@infinity.book";
};

async function sendOTP(email, otp) {
    const subject = "Infinity AI Verification Code";
    const text = `Hello!\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nBest regards,\nInfinity AI Team`;
    const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 32px; font-weight: bold; color: #10a37f;">∞</span>
                <h2 style="margin: 0; font-size: 20px; font-weight: 700;">Infinity AI Verification</h2>
            </div>
            <p style="font-size: 14px; line-height: 1.5; color: #475569;">Hello!</p>
            <p style="font-size: 14px; line-height: 1.5; color: #475569;">To proceed with your Infinity Book verification, enter the following 6-digit code:</p>
            <div style="text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #0f172a; letter-spacing: 6px; background-color: #f1f5f9; padding: 12px 24px; border-radius: 8px; display: inline-block;">${otp}</span>
            </div>
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
        </div>
    `;

    // 1. Try Brevo REST API
    if (process.env.BREVO_API_KEY) {
        console.log("Sending email via Brevo REST API...");
        try {
            const response = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    "accept": "application/json",
                    "api-key": process.env.BREVO_API_KEY.trim(),
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    sender: { name: "Infinity AI", email: getSenderEmail() },
                    to: [{ email: email }],
                    subject: subject,
                    htmlContent: html
                })
            });
            if (response.ok) {
                const data = await response.json();
                console.log("Email Sent via Brevo:", data.messageId || "success");
                return true;
            } else {
                const errText = await response.text();
                console.error("Brevo API Error:", response.status, errText);
            }
        } catch (err) {
            console.error("Brevo REST API Exception:", err);
        }
    }

    // 2. Try Resend REST API
    if (process.env.RESEND_API_KEY) {
        console.log("Sending email via Resend REST API...");
        try {
            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.RESEND_API_KEY.trim()}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    from: process.env.SMTP_FROM || `Infinity AI <${getSenderEmail()}>`,
                    to: email,
                    subject: subject,
                    html: html
                })
            });
            if (response.ok) {
                const data = await response.json();
                console.log("Email Sent via Resend:", data.id || "success");
                return true;
            } else {
                const errText = await response.text();
                console.error("Resend API Error:", response.status, errText);
            }
        } catch (err) {
            console.error("Resend REST API Exception:", err);
        }
    }

    // 3. Try SendGrid REST API
    if (process.env.SENDGRID_API_KEY) {
        console.log("Sending email via SendGrid REST API...");
        try {
            const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.SENDGRID_API_KEY.trim()}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email: email }] }],
                    from: { email: getSenderEmail(), name: "Infinity AI" },
                    subject: subject,
                    content: [{ type: "text/html", value: html }]
                })
            });
            if (response.ok) {
                console.log("Email Sent via SendGrid successfully");
                return true;
            } else {
                const errText = await response.text();
                console.error("SendGrid API Error:", response.status, errText);
            }
        } catch (err) {
            console.error("SendGrid REST API Exception:", err);
        }
    }

    // 4. Default Fallback: SMTP
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error("SMTP credentials missing.");
        return false;
    }

    const mailOptions = {
        from: process.env.EMAIL_FROM || `"Infinity AI" <${getSenderEmail()}>`,
        to: email,
        subject: subject,
        text: text,
        html: html
    };

    try {
        console.log("Attempting fallback standard SMTP mail send...");
        const info = await transporter.sendMail(mailOptions);
        console.log("Email Sent via SMTP:", info.messageId);
        return true;
    } catch (err) {
        console.error("================ SMTP ERROR ================");
        console.error("Name:", err.name);
        console.error("Code:", err.code);
        console.error("Command:", err.command);
        console.error("Response:", err.response);
        console.error("Message:", err.message);
        console.error("Stack:", err.stack);
        console.error("============================================");
        return false;
    }
}

async function sendWelcomeEmail(email, name) {
    const subject = "Welcome to Infinity AI";
    const text = `Hello ${name},\n\nWelcome to Infinity AI!\n\nYour account has been created successfully.\n\nYou are now logged in and can begin using Infinity AI.\n\nThank you for joining us.\n\n— Infinity AI Team`;
    const html = `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 32px; font-weight: bold; color: #10a37f;">∞</span>
                <h2 style="margin: 0; font-size: 20px; font-weight: 700;">Welcome to Infinity AI</h2>
            </div>
            <p style="font-size: 14px; line-height: 1.5; color: #475569;">Hello ${name},</p>
            <p style="font-size: 14px; line-height: 1.5; color: #475569;">Welcome to Infinity AI!</p>
            <p style="font-size: 14px; line-height: 1.5; color: #475569;">Your account has been created successfully.</p>
            <p style="font-size: 14px; line-height: 1.5; color: #475569;">You are now logged in and can begin using Infinity AI.</p>
            <p style="font-size: 14px; line-height: 1.5; color: #475569;">Thank you for joining us.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">— Infinity AI Team</p>
        </div>
    `;

    // 1. Try Brevo REST API
    if (process.env.BREVO_API_KEY) {
        console.log("Sending welcome email via Brevo REST API...");
        try {
            const response = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    "accept": "application/json",
                    "api-key": process.env.BREVO_API_KEY.trim(),
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    sender: { name: "Infinity AI", email: getSenderEmail() },
                    to: [{ email: email }],
                    subject: subject,
                    htmlContent: html
                })
            });
            if (response.ok) {
                console.log("Welcome Email Sent via Brevo");
                return true;
            }
        } catch (err) {
            console.error("Welcome Brevo API Exception:", err);
        }
    }

    // 2. Try Resend REST API
    if (process.env.RESEND_API_KEY) {
        console.log("Sending welcome email via Resend REST API...");
        try {
            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.RESEND_API_KEY.trim()}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    from: process.env.SMTP_FROM || `Infinity AI <${getSenderEmail()}>`,
                    to: email,
                    subject: subject,
                    html: html
                })
            });
            if (response.ok) {
                console.log("Welcome Email Sent via Resend");
                return true;
            }
        } catch (err) {
            console.error("Welcome Resend API Exception:", err);
        }
    }

    // 3. Try SendGrid REST API
    if (process.env.SENDGRID_API_KEY) {
        console.log("Sending welcome email via SendGrid REST API...");
        try {
            const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.SENDGRID_API_KEY.trim()}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email: email }] }],
                    from: { email: getSenderEmail(), name: "Infinity AI" },
                    subject: subject,
                    content: [{ type: "text/html", value: html }]
                })
            });
            if (response.ok) {
                console.log("Welcome Email Sent via SendGrid successfully");
                return true;
            }
        } catch (err) {
            console.error("Welcome SendGrid API Exception:", err);
        }
    }

    // 4. Default Fallback: SMTP
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error("Welcome SMTP credentials missing.");
        return false;
    }

    const mailOptions = {
        from: process.env.EMAIL_FROM || `"Infinity AI" <${getSenderEmail()}>`,
        to: email,
        subject: subject,
        text: text,
        html: html
    };

    try {
        console.log("Attempting fallback standard SMTP welcome mail send...");
        const info = await transporter.sendMail(mailOptions);
        console.log("Welcome Email Sent via SMTP:", info.messageId);
        return true;
    } catch (err) {
        console.error("============ WELCOME SMTP ERROR ============");
        console.error("Name:", err.name);
        console.error("Code:", err.code);
        console.error("Command:", err.command);
        console.error("Response:", err.response);
        console.error("Message:", err.message);
        console.error("Stack:", err.stack);
        console.error("============================================");
        return false;
    }
}

module.exports = { transporter, sendWelcomeEmail, sendOTP };
