import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Api listening on port ${PORT}`);
});
