// server.js - Your Backend API Server (CORRECTED)

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// ✅ Load environment variables
dotenv.config();

const app = express();

// ✅ Import your models and services
const User = require("./models/User");
const Otp = require("./models/Otp");
const { sendOTP, sendWelcomeEmail } = require("./services/emailService");

// ============================================================
// ✅ FIX #1: CORS CONFIGURATION
// ============================================================
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5000",
    "https://infinity-book-1.onrender.com",
    "https://infinity-book.pages.dev",
    process.env.FRONTEND_URL || ""
  ].filter(Boolean),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// ✅ Database Connection
// ============================================================
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ============================================================
// ✅ ROUTE 1: SEND OTP (FIXED)
// ============================================================
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: "Email is required" 
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid email format" 
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`📧 Generated OTP for ${email}: ${otp}`);

    // Delete any existing OTP for this email
    await Otp.deleteMany({ email: email.toLowerCase() });

    // Create new OTP record (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await Otp.create({
      email: email.toLowerCase(),
      otp: otp,
      expiresAt: expiresAt
    });

    console.log("💾 OTP saved to database");

    // ✅ Send email using emailService
    const emailSent = await sendOTP(email, otp);

    if (emailSent) {
      console.log("✅ OTP Email sent successfully");
      return res.status(200).json({
        success: true,
        message: "OTP sent to your email",
        email: email,
        // Remove in production
        testOTP: process.env.NODE_ENV === "development" ? otp : undefined
      });
    } else {
      console.error("❌ Failed to send OTP email");
      return res.status(500).json({
        success: false,
        error: "Failed to send OTP. Please try again."
      });
    }
  } catch (error) {
    console.error("❌ Send OTP Error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// ============================================================
// ✅ ROUTE 2: VERIFY OTP (FIXED)
// ============================================================
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validation
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: "Email and OTP are required"
      });
    }

    // Find OTP record
    const otpRecord = await Otp.findOne({
      email: email.toLowerCase(),
      otp: otp.trim()
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP"
      });
    }

    // Check if OTP expired
    if (new Date() > otpRecord.expiresAt) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        error: "OTP has expired. Please request a new one."
      });
    }

    // ✅ Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = new User({
        email: email.toLowerCase(),
        name: req.body.name || "",
        verified: true,
        lastLogin: new Date()
      });
      await user.save();
      console.log("✅ New user created:", email);

      // Send welcome email
      if (req.body.name) {
        await sendWelcomeEmail(email, req.body.name);
      }
    } else {
      // Update existing user
      user.verified = true;
      user.lastLogin = new Date();
      await user.save();
      console.log("✅ User verified:", email);
    }

    // Delete used OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    // Generate JWT token (if you use JWT)
    const token = require("jsonwebtoken").sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture
      },
      token: token
    });
  } catch (error) {
    console.error("❌ Verify OTP Error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// ============================================================
// ✅ ROUTE 3: SIGNUP (ALTERNATIVE ROUTE)
// ============================================================
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: "Name and email are required"
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "Email already registered"
      });
    }

    // Create user
    const user = new User({
      name,
      email: email.toLowerCase(),
      password: password || "passwordless",
      verified: false
    });

    await user.save();

    // Generate and send OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.create({
      email: email.toLowerCase(),
      otp,
      expiresAt
    });

    const emailSent = await sendOTP(email, otp);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: "Failed to send OTP"
      });
    }

    res.status(201).json({
      success: true,
      message: "Account created. Please verify your email.",
      email: email
    });
  } catch (error) {
    console.error("❌ Signup Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create account"
    });
  }
});

// ============================================================
// ✅ ROUTE 4: RESEND OTP
// ============================================================
app.post("/api/auth/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required"
      });
    }

    // Delete old OTP
    await Otp.deleteMany({ email: email.toLowerCase() });

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.create({
      email: email.toLowerCase(),
      otp,
      expiresAt
    });

    const emailSent = await sendOTP(email, otp);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: "Failed to resend OTP"
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP resent to your email"
    });
  } catch (error) {
    console.error("❌ Resend OTP Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to resend OTP"
    });
  }
});

// ============================================================
// ✅ HEALTH CHECK ENDPOINT
// ============================================================
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    environment: process.env.NODE_ENV || "development"
  });
});

// ============================================================
// ✅ ERROR HANDLING
// ============================================================
app.use((err, req, res, next) => {
  console.error("🔴 Error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error"
  });
});

// ============================================================
// ✅ START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 Infinity AI Server Running        ║
╠════════════════════════════════════════╣
║   Port: ${PORT}                            ║
║   Environment: ${process.env.NODE_ENV || "development"}           ║
║   MongoDB: ${process.env.MONGODB_URI ? "✅ Connected" : "❌ Not configured"}  ║
║   Email Service: ${process.env.BREVO_API_KEY ? "✅ Brevo" : process.env.RESEND_API_KEY ? "✅ Resend" : process.env.SENDGRID_API_KEY ? "✅ SendGrid" : "❌ Not configured"} ║
╚════════════════════════════════════════╝
  `);
});

module.exports = app;
