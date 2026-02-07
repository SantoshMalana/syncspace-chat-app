const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();

// CORS - Allow your frontend domain
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://syncspace-real-time-collaboration.vercel.app"
  ],
  credentials: true
}));


app.use(express.json());

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("🚀 SyncSpace Backend is Running...");
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB Error:", err);
  });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
