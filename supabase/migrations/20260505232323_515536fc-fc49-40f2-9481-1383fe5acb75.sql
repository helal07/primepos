CREATE UNIQUE INDEX IF NOT EXISTS exchange_purchases_imei_unique
ON public.exchange_purchases (imei)
WHERE imei IS NOT NULL AND imei <> '';