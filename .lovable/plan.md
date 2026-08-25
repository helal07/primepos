# Payment gateways: bKash, EPS, SSLCommerz

The Payment Gateways tab is empty because no gateway rows exist in the database yet — the page only lists rows it finds. Also, bKash and EPS are wired as placeholders (they redirect straight to the callback without calling the provider), and SSLCommerz doesn't exist at all.

## What will be built

1. **Seed the three gateways** so cards appear immediately in Superadmin > SaaS Settings > Payment Gateways:
   - bKash Merchant (Checkout / tokenized)
   - EPS
   - SSLCommerz
   Each with mode (sandbox/live), active toggle, visible-to-tenants toggle, sort order.

2. **Credential fields per gateway** in the settings UI:
   - bKash: App Key, App Secret, Username, Password, base URL auto-selected by mode
   - EPS: Merchant ID, Store ID, Username, Password, Hash Key
   - SSLCommerz: Store ID, Store Password, sandbox/live switch
   Secrets stay write-only in the UI (masked, never echoed back once saved).

3. **Real gateway integrations** replacing the placeholders:
   - bKash: grant token -> create payment -> redirect -> execute/query payment on callback
   - SSLCommerz: session create -> redirect -> IPN/validation call verified against amount + transaction id
   - EPS: initiate + hash-verified callback
   Each verifies the amount and the payment record before marking it paid, so a forged callback cannot activate a package.

4. **Auto-activate the package after successful payment** (already partly in place): on verified success the payment is marked completed and the tenant is set to active with subscription start/end computed from monthly/yearly. Tenant gets a success notification. Failed/cancelled callbacks mark the payment failed and leave the tenant untouched.

5. **Tenant-facing checkout**: the subscription/registration payment step lists only gateways that are active + visible, instead of the hardcoded bKash/EPS pair.

## Technical notes

- Migration/seeder adds rows to `payment_gateways`; credentials stored in `payment_gateway_credentials.config` (JSON), read server-side only.
- New `SslCommerzGateway` implementing `PaymentGatewayInterface`; registered in `PaymentGatewayResolver` alongside `bkash` and `eps`.
- `BkashGateway` and `EpsGateway` rewritten to load credentials from the DB by gateway code + mode instead of returning the callback URL.
- `PaymentController::callback` keeps logging every attempt to `payment_attempts`, adds amount/status verification and idempotency so a repeated callback can't extend a subscription twice.
- A public endpoint returns only non-secret gateway info (code, display name, logo) for the tenant checkout list.
- `src/lib/functions.ts` gateway union widens from `"bkash" | "eps"` to include `sslcommerz`.

## What you need to provide

Sandbox/live credentials for each gateway you want live. Without them the gateway can be saved and toggled off; enabling it with empty credentials returns a clear error instead of a broken redirect.
