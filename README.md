# SimNow eSIM store

An online store that sells **Airvoice Wireless plans** delivered as an eSIM.
Customers pick a plan, pay, and get their eSIM QR code on their order page after you activate the line.

**SimNow is an independent seller, not Airvoice Wireless.** This store does not use Airvoice logos and is not the official Airvoice website.

## What is live today, and what still needs you

- **Plans and prices** are the real Airvoice Wireless prepaid plans, recorded from [airvoicewireless.com/plans](https://airvoicewireless.com/plans) on **November 9, 2026**. Multi-month plans are paid upfront (the monthly rate is shown for reference).
- **Payments** can be real. Add your Stripe keys (steps below) and customers pay by card, Apple Pay, Google Pay and more on Stripe's page. Until you add the keys, the store stays in TEST MODE and nothing is charged.
- **Activation is still done by you, by hand.** You are not an authorized Airvoice dealer yet, so the store cannot issue a real eSIM by itself. After a customer pays, the order shows **Paid – awaiting activation**. You activate the line in the dealer portal (once HTH Communications approves you), then paste the eSIM details in `/admin`. The customer's order page then shows the real QR code (`LPA:1$SM-DP+ address$activation code`).

## Rename the store

Change `STORE_NAME` in `config.js` (or set the `STORE_NAME` environment variable on Render). That one value is used everywhere.

## What's inside

- **Home**: Airvoice Wireless plans, with search and filters (price, data, term, 5G, unlimited).
- **Plan page**: data, talk/text, how long it lasts, network, price, and a note that activation happens after we confirm the order.
- **Check my phone**: pick an iPhone, Pixel or Galaxy model to see if it supports eSIM. The phone must also be carrier-unlocked.
- **Checkout**: email, plan, optional "keep my number", and payment. A note on the page says SimNow is an independent seller and that activation is completed after the order is confirmed.
- **Order page**: "Paid – awaiting activation" at first; after you activate, the QR code and the manual SM-DP+ / activation codes.
- **My orders**: find an order with email + order number.
- **Owner dashboard** (`/admin`): see orders, mark a paid order activated (ICCID, SM-DP+ address, activation code, phone number), and edit plans and prices.

Privacy: the transfer PIN is checked at checkout so we know the customer has it, then dropped. It is never saved, logged or shown again. Full card numbers never touch this server when Stripe is on. Only the last 4 digits of a port-in account number are kept.

## Turn on real payments (Stripe)

Do this on a computer or in your phone's browser. You will copy two values into Render.

1. Open [Stripe](https://dashboard.stripe.com/register) and create an account. Finish the identity and bank checks so you can accept live payments (you can start in test mode first).
2. Open [API keys](https://dashboard.stripe.com/apikeys). Copy the **Secret key**. It starts with `sk_test_` (test) or `sk_live_` (real charges). Never share this key in chat or email.
3. Open your SimNow service on [Render](https://dashboard.render.com). Tap **Environment**.
4. Find `STRIPE_SECRET_KEY` and paste the secret key. Save.
5. Still on Stripe, open [Webhooks](https://dashboard.stripe.com/webhooks) and add an endpoint:
   - URL: `https://YOUR-SITE.onrender.com/api/stripe/webhook` (use your real site link, for example `https://esim-store-qyu9.onrender.com/api/stripe/webhook`)
   - Events to send: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `checkout.session.expired`
6. Open that webhook and copy the **Signing secret**. It starts with `whsec_`.
7. Back in Render → Environment, paste it into `STRIPE_WEBHOOK_SECRET`. Save, and wait for the service to restart.
8. Optional but helpful: add `PUBLIC_URL` with your site link (`https://esim-store-qyu9.onrender.com`) so Stripe's "success" and "cancel" pages always come back to you.

When `STRIPE_SECRET_KEY` is set, the TEST MODE banner goes away and checkout sends customers to Stripe. When it is empty, the store stays in TEST MODE.

Use Stripe test keys (`sk_test_…` and a test webhook secret) until you are ready to take real money. In the Stripe test dashboard, use card `4242 4242 4242 4242`.

## How you fulfill an order

1. A customer pays. You will see the order in `/admin` as **Paid – awaiting activation**.
2. In the Airvoice / HTH dealer portal, activate that plan as an eSIM (and start the number transfer if they asked to keep their number). You will need to ask the customer for the transfer PIN again — it is not stored here.
3. On the same order in `/admin`, enter the ICCID, SM-DP+ address, activation code (or paste a full `LPA:1$…` code), and the phone number if you have it. Tap **Mark activated**.
4. The customer refreshes their order page (or finds it under My orders) and scans the QR code.

## Run it yourself

```
npm install
npm start            # http://localhost:3100 (or $PORT)
npm test             # API + phone-size browser tests + Stripe tests
npm run screenshots  # saves screenshots/ (needs Chrome at /usr/bin/google-chrome or CHROME_PATH)
```

If `ADMIN_PASSWORD` isn't set, a random one is made and saved in `data/admin-password.txt`.
Data is kept in `data/db.json` (created automatically).

## Put it online (Render)

The site is already at [https://esim-store-qyu9.onrender.com](https://esim-store-qyu9.onrender.com) from the `john67k/esim-store` GitHub repo. After you push an update, Render will redeploy. Your admin password is in Render under Environment, then `ADMIN_PASSWORD`.

Note: on Render's free plan the disk is wiped on each deploy/restart, so orders and plan edits are lost. Before going live, add a Render disk (paid) and set `DATA_DIR` to it, or move to a database.

## Going further

1. **Get the right to sell Airvoice plans.** Email sales@hthcomm.com and ask whether an online-only seller can be authorized to activate Airvoice eSIMs. You will usually need an EIN.
2. Once you have a dealer portal or a wholesaler API, we can connect it so activations happen automatically.
3. Add terms of service, a privacy policy and a refund policy. Collect sales tax where required. Keep the "independent seller" footer and don't use Airvoice logos unless your dealer agreement allows it.
4. Add email so customers get a receipt and, later, their QR code (for example Postmark, Resend or SendGrid).

## Files

- `config.js`: store name and the independent-seller disclaimer
- `lib/airvoice-plans.js`: the official plan catalog, with source URLs and the date they were recorded
- `server.js`: the web server and API, including the Stripe webhook and manual activation
- `providers/payments/stripe.js`: Stripe Checkout; `mock.js`: simulated payments for TEST MODE
- `providers/supplier/`: kept for a future automatic activation API
- `public/`: the pages (plain HTML/CSS/JS)
- `test/`: API tests (`e2e.js`), phone-size browser tests (`ui.js`), and Stripe tests (`stripe.js`)
