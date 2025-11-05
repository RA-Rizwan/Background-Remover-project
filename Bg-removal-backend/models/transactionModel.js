// models/transactionModel.js
import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    clerkId: { type: String, required: true },
    plan: { type: String, required: true },
    amount: { type: Number, required: true },
    credits: { type: Number, required: true },
    payment: { type: Boolean, default: false },
    status: {
        type: String,
        enum: ["pending", "success", "failed"],
        default: "pending",
    },
    stripePaymentIntentId: { type: String },
    date: { type: Number, default: Date.now },
});

const transactionModel =
    mongoose.models.transaction ||
    mongoose.model("transaction", transactionSchema);

export default transactionModel;
