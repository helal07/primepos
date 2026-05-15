Root cause found: `public/.htaccess` currently sends this header:

```text
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

That explicitly disables camera for the whole site on Apache/Hostinger deployments. When this header is active, Chrome blocks `getUserMedia` before it can show the camera prompt, so the domain will not appear in Camera site settings and the top-bar lock panel will not show a Camera permission option.

Plan:

1. Update `public/.htaccess`
   - Change the `Permissions-Policy` header so camera is allowed for the site itself.
   - Use a safe policy like:
     ```text
     Permissions-Policy: geolocation=(), microphone=(), camera=(self)
     ```
   - Keep other security headers unchanged.

2. Harden `BarcodeScanner.tsx` for this exact failure mode
   - Detect browser policy blocks (`NotAllowedError` / permission denial with no prompt) and show a clear message: camera may be blocked by site/server policy, not Chrome settings.
   - Add a diagnostic hint when `navigator.mediaDevices` or secure context is unavailable.
   - Keep manual photo upload fallback.

3. Improve mobile scanner dialog usability
   - Make the purchase scanner dialog full-width / scroll-friendly on mobile so all buttons and instructions remain reachable.
   - Keep desktop size unchanged.

4. Verification
   - Run a targeted test/static check where possible.
   - Important deployment note: after this fix, the site must be republished/reuploaded to the custom domain host so the updated `.htaccess` is active on `pos.itsheba.bd`.