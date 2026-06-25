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
    if (!emailUser || !emailPass) {
        console.error("SMTP credentials missing.");
        return false;
    }

    const mailOptions = {
        from: `"Infinity AI" <${emailUser}>`,
        to: email,
        subject: "Infinity AI Verification Code",
        text: `Hello!\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nBest regards,\nInfinity AI Team`,
        html: `
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
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email Sent:", info.messageId);
        return true;
    } catch (err) {
        console.error("Email Send Error:", err);
        return false;
    }
}

module.exports = { transporter, verifySMTP, sendOTP };
