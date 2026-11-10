# SimNow eSIM store (test mode)

An online store that sells prepaid US phone plans delivered as an eSIM.
Customers pick a plan, check their phone works, pay, and get an eSIM QR code on screen.

**Right now it runs in TEST MODE:** the plans and prices are example data, payments are simulated,
and the eSIM QR code is a SAMPLE that will not activate. Nothing is sold or charged.

## Rename the store
Change `STORE_NAME` in `config.js` (or set the `STORE_NAME` environment variable on Render). That one value is used everywhere.

## What's inside
- **Home**: search and filter plans by network, price, data, 5G, unlimited and hotspot.
- **Plan page**: data, talk/text, hotspot, how many days it lasts, network, price.
- **Check my phone**: pick an iPhone, Pixel or Galaxy model to see if it supports eSIM, plus a reminder that the phone must be carrier-unlocked.
- **Checkout**: email, plan, optional "keep my number" (current carrier, account number, transfer PIN, ZIP), and payment by card, Apple Pay, Google Pay, Cash App, PayPal or crypto (all simulated). Card numbers are checked with the Luhn rule.
- **Confirmation**: QR code, the manual code (SM-DP+ address + activation code in `LPA:1$address$code` format), and step-by-step install help for iPhone and Android.
- **My orders**: find an order with email + order number.
- **Owner dashboard** (`/admin`): see orders, sales and profit; add, edit, hide or remove plans; set your cost and markup % or your own price.

Privacy: the transfer PIN is passed to the supplier and then dropped. It is never saved, logged or shown again. Full card numbers and CVCs are never saved, and only the last 4 digits of the account number are kept.

## Run it
```
npm install
npm start            # http://localhost:3100 (or $PORT)
npm test             # API + phone-size browser tests
npm run screenshots  # saves screenshots/ (needs Chrome at /usr/bin/google-chrome or CHROME_PATH)
```
If `ADMIN_PASSWORD` isn't set, a random one is made and saved in `data/admin-password.txt`.
Data is kept in `data/db.json` (created automatically).

## Put it online (Render, free)
Push this folder to GitHub, then open `https://render.com/deploy?repo=<your repo URL>`. `render.yaml` sets everything up and generates `ADMIN_PASSWORD` (find it in Render under your service, then Environment).
Note: on Render's free plan the disk is wiped on each deploy/restart, so orders and plan edits are lost. Before going live, add a Render disk (paid) and set `DATA_DIR` to it, or move to a database.

## Going live: what you need (plain language)
1. **Get the right to sell the plans.** You can't just resell Boost Mobile, Airvoice or other carrier plans. Pick one:
   - **Become an authorized dealer** with each carrier you want to sell (each has its own dealer program, application and rules), or
   - **Sign up with a prepaid wholesaler / distributor** that already has carrier agreements and gives dealers an API for activations and refills. This is usually the easiest way to start.
   Ask them for: API access for eSIM activation and port-in, wholesale prices, and their rules on how you may use carrier names in ads.
2. **Connect the supplier.** Fill in the TODOs in `providers/supplier/wholesaler.js`, set `SUPPLIER=wholesaler`, `SUPPLIER_API_URL` and `SUPPLIER_API_KEY`. Put the supplier's real plans and your prices in the admin page, and untick "Example data".
3. **Set up Stripe.** Create a Stripe account (needs ID and bank verification), finish `providers/payments/stripe.js` (notes inside), set `PAYMENT_PROVIDER=stripe` and the Stripe keys. Switch the card form to Stripe's Payment Element so card numbers never touch your server. PayPal and crypto need their own accounts (PayPal Business; Coinbase Commerce, BitPay or similar).
4. **Handle number transfers (port-in) carefully.** Only submit a transfer the customer asked for, and keep proof of their consent. Send the PIN only to the supplier and never store it. Follow the carrier/supplier rules and FCC rules against SIM-swap and port-out fraud: check the customer's identity, watch for fraud, and give a way to report problems.
5. **Legal basics.** Add terms of service, a privacy policy and a refund policy. Collect sales tax and telecom fees where required (your supplier or an accountant can tell you which). Keep the "not affiliated" footer and don't use carrier logos unless your dealer agreement allows it.
6. **Add email** so customers get their QR code by email (e.g. Postmark, Resend or SendGrid).

## Files
- `config.js`: store name, disclaimer, which supplier/payment provider to use
- `server.js`: the web server and API
- `providers/supplier/mock.js`: test supplier (SAMPLE eSIMs); `wholesaler.js`: stub for the real one
- `providers/payments/mock.js`: simulated payments; `stripe.js`: stub for going live
- `lib/sample-plans.js`: example catalog; `lib/devices.js`: eSIM phone list
- `public/`: the pages (plain HTML/CSS/JS)
- `test/`: API tests (`e2e.js`) and phone-size browser tests (`ui.js`)
