WITH providers(provider) AS (VALUES ('nova'),('orbit'),('pulse')),
 totals AS (SELECT provider_id AS provider,
 coalesce(sum(stake_minor-payout_minor) FILTER (WHERE settled_at >= %(from)s::timestamptz),0)
 - coalesce(sum(stake_minor-payout_minor) FILTER (WHERE settled_at < %(from)s::timestamptz),0) AS change
 FROM opslens_private.transactions WHERE status='settled'
 AND settled_at >= %(from)s::timestamptz-(%(to)s::timestamptz-%(from)s::timestamptz)
 AND settled_at < %(to)s::timestamptz
 AND (%(brand)s::text IS NULL OR brand_id=%(brand)s::text)
 AND (%(provider)s::text IS NULL OR provider_id=%(provider)s::text) GROUP BY 1)
SELECT provider,coalesce(change,0) AS change FROM providers LEFT JOIN totals USING(provider)
WHERE (%(provider)s::text IS NULL OR provider=%(provider)s::text) ORDER BY 1
