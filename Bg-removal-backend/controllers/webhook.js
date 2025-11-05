import Stripe from "stripe";
import transactionModel from "../models/transactionModel.js";
import userModel from "../models/userModel.js";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;
    try {
        // IMPORTANT: req.body must be raw (express.raw) for this route
        event = stripeInstance.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.log("Stripe webhook verify error:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case "payment_intent.succeeded": {
            const paymentIntent = event.data.object;

            // we stored these in paymentIntent metadata when creating it
            const {
                clerkId,
                transactionId,
                credits,
                plan,
            } = paymentIntent.metadata || {};

            // 1) mark transaction as success
            if (transactionId) {
                await transactionModel.findByIdAndUpdate(
                    transactionId,
                    {
                        status: "success",
                        payment: true,
                        stripePaymentIntentId: paymentIntent.id,
                    },
                    { new: true }
                );
            }

            // 2) add credits to user
            if (clerkId && credits) {
                const user = await userModel.findOne({ clerkId });
                if (user) {
                    user.creditBalance = (user.creditBalance || 0) + Number(credits);
                    await user.save();
                }
            }

            break;
        }

        case "payment_intent.payment_failed": {
            const paymentIntent = event.data.object;
            const { transactionId } = paymentIntent.metadata || {};
            if (transactionId) {
                await transactionModel.findByIdAndUpdate(transactionId, {
                    status: "failed",
                });
            }
            break;
        }

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
};
