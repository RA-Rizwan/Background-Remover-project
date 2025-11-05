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

//stripe GATEWAY initilize
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
const currency = (process.env.CURRENCY || "USD").toLowerCase();

//
//purchase credit
export const paymentStripe = async (req, res) => {
  try {
    // you were taking from body, but sometimes you'll have it from middleware too
    const clerkId = req.user?.clerkId || req.body.clerkId;
    const { planId } = req.body;

    const userData = await userModel.findOne({ clerkId });
    if (!userData || !planId) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    let credits, plan, amount;
    switch (planId) {
      case "Basic":
        plan = "Basic";
        credits = 100;
        amount = 10; // USD/EUR/whatever
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

    const date = Date.now();

    // 1. create transaction in DB with pending status
    const transactionData = {
      clerkId,
      plan,
      amount,
      credits,
      date,
      status: "pending",
    };
    const newTransaction = await transactionModel.create(transactionData);

    // 2. create Stripe PaymentIntent
    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: amount * 100, // stripe is in cents
      currency,
      metadata: {
        clerkId,
        transactionId: newTransaction._id.toString(),
        plan,
        credits: credits.toString(),
      },
    });

    // 3. send clientSecret to frontend
    return res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      message: "Payment intent created",
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export { clerkWebhooks, userCredits };
