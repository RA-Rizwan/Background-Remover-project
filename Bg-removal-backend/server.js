import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./configs/mongodb.js";
import userRouter from "./routes/userRoutes.js";
import imageRouter from "./routes/imageRoutes.js";
import { stripeWebhooks } from "./controllers/webhook.js";

//app config
const PORT = process.env.PORT || 4000;

const app = express();
await connectDB()

//init middleware
app.use(cors());

app.post(
    "/api/user/stripe-webhooks",
    express.raw({ type: "application/json" }),
    stripeWebhooks
);
app.use(express.json());

//API routes
app.get("/", (req, res) => res.send("API Working"));
app.use("/api/user", userRouter)
app.use("/api/image",imageRouter)

app.listen(PORT,()=> console.log("Server running"));
