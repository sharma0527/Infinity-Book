const nodemailer = require("nodemailer");

const emailUser = (process.env.EMAIL_USER || process.env.EMAIL || "").trim().replace(/^["']|["']$/g, '');
let emailPass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || "";
if (emailPass) {
    emailPass = emailPass.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
}

let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: emailUser,
        pass: emailPass
    },
    family: 4,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
});

// Verify SMTP connection on service load
async function verifySMTP() {
    // Skip SMTP verification if a REST API key is configured
    if (process.env.BREVO_API_KEY || process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY) {
        console.log("✅ Email service running via HTTP REST API (SMTP verification bypassed)");
        return true;
    }

    try {
        console.log("Attempting SMTP verification on Port 465 (SSL)...");
        await transporter.verify();
        console.log("✅ SMTP Ready (Port 465)");
        return true;
    } catch (err) {
        console.warn(`SMTP Port 465 Verify Failed (${err.message}). Trying fallback Port 587 (STARTTLS)...`);
        
        transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: emailUser,
                pass: emailPass
            },
            family: 4,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
        });

        try {
            await transporter.verify();
            console.log("✅ SMTP Ready (Port 587)");
            return true;
        } catch (fallbackErr) {
            console.error("SMTP Verify Failed on all configurations:", fallbackErr.message);
            return false;
        }
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
                    sender: { name: "Infinity AI", email: emailUser || "no-reply@infinity.book" },
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
                    from: emailUser ? `Infinity AI <${emailUser}>` : "Infinity AI <onboarding@resend.dev>",
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
                    from: { email: emailUser || "no-reply@infinity.book", name: "Infinity AI" },
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
    if (!emailUser || !emailPass) {
        console.error("Welcome SMTP credentials missing.");
        return false;
    }

    const mailOptions = {
        from: `"Infinity AI" <${emailUser}>`,
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
        console.error("Welcome Email Send via SMTP Error:", err);
        return false;
    }
}

module.exports = { transporter, verifySMTP, sendWelcomeEmail };
