import Stripe from "stripe";
import Booking from "../models/Booking.js";
import Carer from "../models/Carer.js";
import dotenv from "dotenv";
import sequelize from "../config/db.js";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET);

/**
 * 🔥 Client Pay for Completed Booking
 * endpoint: POST /api/client/pay/:id
 */
export const payForBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;

    // Fetch booking + carer info
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Carer, attributes: ["charge_hrs", "full_name", "email"] }
      ]
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Ensure client owns this booking
    if (booking.client_id !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Ensure booking is completed
    if (booking.status !== "completed") {
      return res.status(400).json({
        message: "Payment allowed only after booking is completed"
      });
    }

    // Ensure carer has a rate
    if (!booking.Carer || !booking.Carer.charge_hrs) {
      return res.status(400).json({
        message: "Carer has no charge rate set"
      });
    }

    // Compute total cost
    const chargeRate = booking.Carer.charge_hrs;
    const hours = booking.service_hrs || 0;
    const totalCost = chargeRate * hours;

    // Stripe expects amount in cents
    const amountInCents = Math.round(totalCost * 100);

    // Check if already paid
    if (booking.payment_status === "paid") {
      return res.status(400).json({ message: "Booking already paid" });
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "gbp",
      description: `Booking #${booking.id} payment for ${booking.Carer.full_name}`,
      metadata: {
        booking_id: booking.id,
        client_id: req.user.id,
        carer_id: booking.carer_id
      }
    });

    return res.status(200).json({
      message: "Payment initiated successfully",
      clientSecret: paymentIntent.client_secret,
      total_cost: totalCost,
      booking_id: booking.id
    });

  } catch (error) {
    console.error("❌ Stripe Payment Error:", error);
    return res.status(500).json({ message: "Payment error", error: error.message });
  }
};

export const createCheckoutSession = async (req, res, next) => {
  try {
    const bookingId = req.params.id;

    // load booking + carer
    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: Carer, attributes: ["charge_hrs", "full_name", "email"] }],
    });

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // ownership & status checks
    if (booking.client_id !== req.user.id) return res.status(403).json({ message: "Unauthorized" });
    if (booking.status !== "completed") {
      return res.status(400).json({ message: "Payment allowed only after booking is completed" });
    }
    if (booking.payment_status === "paid") {
      return res.status(400).json({ message: "Booking already paid" });
    }
    if (!booking.Carer || !booking.Carer.charge_hrs) {
      return res.status(400).json({ message: "Carer has no charge rate set" });
    }

    // compute total cost
    const rate = Number(booking.Carer.charge_hrs) || 0;
    const hours = Number(booking.service_hrs) || 0;
    const totalCost = rate * hours;
    if (totalCost <= 0) return res.status(400).json({ message: "Invalid total cost" });

    const amountInCents = Math.round(totalCost * 100);

    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Booking #${booking.id} - ${booking.service_type || "Service"}`,
              description: `Service by ${booking.Carer.full_name || "Carer"}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: String(booking.id),
        client_id: String(req.user.id),
        carer_id: String(booking.carer_id),
      },
      success_url: `${process.env.FRONTEND_URL || "https://example.com"}/payment-success?bookingId=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || "https://example.com"}/payment-cancel?bookingId=${booking.id}`,
    });

    return res.status(200).json({
      message: "Checkout session created",
      url: session.url,
      sessionId: session.id,
      total_cost: totalCost,
      booking_id: booking.id,
    });
  } catch (error) {
    console.error("❌ createCheckoutSession error:", error);
    next(error);
  }
};

/**
 * POST /api/client/stripe-webhook
 * Webhook endpoint to listen for checkout.session.completed events
 * Use raw body (express.raw) and verify signature via STRIPE_WEBHOOK_SECRET
 */
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      // get metadata
      const bookingId = session.metadata?.booking_id;
      const clientId = session.metadata?.client_id;

      if (!bookingId) {
        console.warn("⚠️ checkout.session.completed without booking_id metadata");
        return res.status(200).send("ignored");
      }

      // mark booking as paid atomically (use transaction)
      await sequelize.transaction(async (t) => {
        const booking = await Booking.findByPk(bookingId, { transaction: t });
        if (!booking) {
          console.warn("⚠️ Booking not found for webhook:", bookingId);
          return;
        }
        // If already paid, skip
        if (booking.payment_status === "paid") return;

        booking.payment_status = "paid";
        booking.payment_intent = session.payment_intent || session.payment_intent || null;
        await booking.save({ transaction: t });
      });

      console.log(`✅ Booking ${bookingId} marked as paid via Stripe Checkout`);
    } catch (err) {
      console.error("❌ Error processing webhook:", err);
      // don't throw — respond 200 to acknowledge receipt to Stripe; handle errors separately
    }
  }

  // Respond to Stripe
  res.json({ received: true });
};
