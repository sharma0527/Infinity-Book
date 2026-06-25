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
                    sender: { name: "Infinity AI", email: emailUser || "no-reply@infinity.book" },
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
                    from: emailUser ? `Infinity AI <${emailUser}>` : "Infinity AI <onboarding@resend.dev>",
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
                    from: { email: emailUser || "no-reply@infinity.book", name: "Infinity AI" },
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

    // 4. Default Fallback: SMTP (blocked on Render Free tier, works locally/Railway/paid Render)
    if (!emailUser || !emailPass) {
        console.error("SMTP credentials missing.");
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
        console.log("Attempting fallback standard SMTP mail send...");
        const info = await transporter.sendMail(mailOptions);
        console.log("Email Sent via SMTP:", info.messageId);
        return true;
    } catch (err) {
        console.error("Email Send via SMTP Error:", err);
        return false;
    }
}

module.exports = { transporter, verifySMTP, sendOTP };
