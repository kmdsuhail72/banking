const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");

/* Route Imports */

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

/* Load Environment Variables */

dotenv.config();

/* Connect MongoDB */

connectDB();

/* Initialize Express */

const app = express();

/* Middleware */

app.use(cors());

app.use(express.json());

/* API Routes */

app.use("/api/auth", authRoutes);

app.use("/api/user", userRoutes);

app.use("/api/transactions", transactionRoutes);

/* Test Route */

app.get("/", (req, res) => {

  res.send("Banking API Running");

});

/* Server Port */

const PORT = process.env.PORT || 5000;

/* Start Server */

app.listen(PORT, () => {

  console.log(`Server running on port ${PORT}`);

});