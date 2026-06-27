const mongoose = require("mongoose");
const dns = require("dns");

// Programmatically resolve querySrv DNS issues (common with Airtel/Jio ISPs in India/other regions blocking SRV lookups)
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (err) {
  console.warn("Warning: Could not set custom DNS servers, using system defaults:", err.message);
}

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is missing.");
    }
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    throw error;
  }
};

module.exports = connectDB;
