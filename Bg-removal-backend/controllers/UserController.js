//API controller fun to manage clerk user with database
//http://localhost:4000/api/user/webhooks

import { Webhook } from "svix";
import userModel from "../models/userModel.js";
import transactionModel from "../models/transactionModel.js";
import Stripe from "stripe"

const clerkWebhooks = async (req, res) => {
  try {
    //create a Svix instance with clerk webhook secret
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    await whook.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });
    const { data, type } = req.body;
    switch (type) {
      case "user.created": {
        const userData = {
          clerkId: data.id,
          email: data.email_addresses[0].email_address,
          firstName: data.first_name,
          lastName: data.last_name,
          photo: data.image_url,
        };
        await userModel.create(userData);
        res.json({});

        break;
      }
      case "user.updated": {
        const userData = {
          email: data.email_addresses[0].email_address,
          firstName: data.first_name,
          lastName: data.last_name,
          photo: data.image_url,
        };
        await userModel.findOneAndUpdate({ clerkId: data.id }, userData);
        res.json({});
        break;
      }
      case "user.deleted": {
        await userModel.findOneAndDelete({ clerkId: data.id });
        res.json({});
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

//API COntroller function to get user available credits data
const userCredits = async (req, res) => {
  try {
    const { clerkId } = req.user;
    const userData = await userModel.findOne({ clerkId });
    res.json({ success: true, credits: userData.creditBalance });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const currency = (process.env.CURRENCY || "USD").toLowerCase();

export const paymentStripe = async (req, res) => {
  try {
    const clerkId = req.user?.clerkId || req.body.clerkId;
    const { planId } = req.body;

    const user = await userModel.findOne({ clerkId });
    if (!user || !planId) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    // map plans
    let credits, plan, amount;
    switch (planId) {
      case "Basic":
        plan = "Basic";
        credits = 100;
        amount = 10;
        break;
      case "Advanced":
        plan = "Advanced";
        credits = 500;
        amount = 50;
        break;
      case "Business":
        plan = "Business";
        credits = 5000;
        amount = 250;
        break;
      default:
        return res.json({ success: false, message: "Invalid planId" });
    }

    // create pending transaction in DB
    const tx = await transactionModel.create({
      clerkId,
      plan,
      amount,
      credits,
      status: "pending",
      payment: false,
      date: Date.now(),
    });

    // create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amount * 100,
            product_data: {
              name: `${plan} Credits (${credits})`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        clerkId,
        transactionId: tx._id.toString(),
        credits: credits.toString(),
        plan,
      },
      success_url: `${process.env.FRONTEND_URL}/payment-success`,
      cancel_url: `${process.env.FRONTEND_URL}/buy-credits`,
    });

    return res.json({
      success: true,
      sessionId: session.id,
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
export { clerkWebhooks, userCredits };
