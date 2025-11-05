// controllers/webhook.js
import Stripe from "stripe";
import transactionModel from "../models/transactionModel.js";
import userModel from "../models/userModel.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.log("Stripe webhook verify error:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        // user paid successfully on hosted checkout page
        case "checkout.session.completed": {
            const session = event.data.object;
            const {
                clerkId,
                transactionId,
                credits,
                plan,
            } = session.metadata || {};

            // 1) mark transaction as paid
            if (transactionId) {
                await transactionModel.findByIdAndUpdate(
                    transactionId,
                    {
                        status: "success",
                        payment: true,
                        stripePaymentIntentId: session.payment_intent,
                    },
                    { new: true }
                );
            }

            // 2) add credits to user
            if (clerkId && credits) {
                const user = await userModel.findOne({ clerkId });
                if (user) {
                    user.creditBalance =
                        (user.creditBalance || 0) + Number(credits);
                    await user.save();
                }
            }
            break;
        }

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
};
