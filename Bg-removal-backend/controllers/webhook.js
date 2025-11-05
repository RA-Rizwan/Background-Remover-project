import Stripe from "stripe";
import transactionModel from "../models/transactionModel.js";
import userModel from "../models/userModel.js";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;
    try {
        event = stripeInstance.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.log("Webhook error", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object;
            const { clerkId, transactionId, credits } = session.metadata || {};

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