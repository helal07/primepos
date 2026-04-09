# Barcode Scanner Integration for POS

## What We're Building

Add a barcode/IMEI scanner button to the POS search bar that uses the device camera (via the `html5-qrcode` library) to scan barcodes, QR codes, and IMEI numbers. When scanned, the product is looked up by barcode, SKU, or IMEI and auto-added to the cart. The existing text search already supports name/SKU/barcode — this adds camera-based scanning.

## How It Works

1. A **scan icon button** appears next to the search input
2. Clicking it opens a dialog with a live camera feed for barcode scanning
3. On successful scan, the scanned value is matched against products by IMEI/ Serial,`barcode`, `sku`, or `name`
4. If a match is found, the product is auto-added to cart and the scanner closes
5. If no match, a toast error appears ("Product not found")
6. Manual search still works as before — the scanned value also populates the search field as fallback

## Technical Details

### New dependency

- `html5-qrcode` — lightweight barcode/QR scanner using device camera, supports Code128, EAN, UPC, QR, etc.

### Files Changed

`**src/pages/POS.tsx**`

- Add a `ScanBarcode` icon button beside the search input
- New state: `showScanner` (boolean)
- Scanner dialog with `Html5QrcodeScanner` component
- `onScanSuccess(code)` callback: search products array for matching `barcode`, `sku`, or name, call `addToCart()` if found
- Auto-close scanner on successful scan
- Works on both mobile (rear camera) and desktop (webcam)

`**src/components/pos/BarcodeScanner.tsx**` (new)

- Reusable scanner component wrapping `html5-qrcode`
- Props: `onScan(code: string)`, `onClose()`
- Handles camera permissions, error states, and cleanup on unmount
- Supports both rear and front cameras with a toggle