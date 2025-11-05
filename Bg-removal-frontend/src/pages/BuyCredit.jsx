import React, { useContext } from "react";
import { assets, plans } from "../assets/assets";
import { AppContext } from "../context/AppContext";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const BuyCredit = () => {
  const { backendUrl } = useContext(AppContext);
  const { getToken } = useAuth();

  const paymentStripe = async (planId) => {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/user/pay-stripe`,
        { planId },
        { headers: { token } }
      );

      // if (!data.success) {
      //   return toast.error(data.message || "Unable to start payment");
      // }

      // const stripe = await stripePromise;
      // const { error } = await stripe.redirectToCheckout({
      //   sessionId: data.sessionId,
      // });
        if (data.success && data.url) {
          window.location.href = data.url; // 👈 go to Stripe hosted page
        } else {
          toast.error(data.message || "Could not start checkout");
        }

      if (error) {
        console.error(error);
        toast.error(error.message);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-[80vh] text-center pt-14 mb-10">
      <button className="border border-gray-400  text-gray-700 px-10 py-2 rounded-full mb-6">
        OUR PLANS
      </button>
      <h2 className="text-center text-2xl md:text-3xl lg:text-4xl mt-4 font-semibold bg-gradient-to-r from-gray-900 to-gray-400 bg-clip-text text-transparent mb-6 sm:mb-10">
        Choose the plan that's right for you
      </h2>
      <div className="flex flex-wrap justify-center gap-6 text-left">
        {plans.map((item, idx) => (
          <div
            className="bg-white drop-shadow-sm rounded-lg py-12 px-8 text-gray-700 hover:scale-105 transition-all duration-500"
            key={idx}
          >
            <img width={40} src={assets.logo_icon} alt="" />
            <p className="mt-3 font-semibold">{item.id}</p>
            <p className="text-sm">{item.desc}</p>
            <p className="mt-6">
              <span className="text-3xl font-medium">${item.price}</span>/{" "}
              {item.credits} credits
            </p>
            <button
              onClick={() => paymentStripe(item.id)}
              className="w-full bg-gray-800 text-white mt-8 text-sm rounded-md py-2.5 min-w-52"
            >
              Purchase
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BuyCredit;
