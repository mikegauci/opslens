WITH days AS (SELECT generate_series(%(from)s::timestamptz,
 %(to)s::timestamptz - interval '1 day', interval '1 day') AS day),
 totals AS (SELECT date_trunc('day',settled_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS day,
 sum(stake_minor-payout_minor) AS ggr
 FROM opslens_private.transactions WHERE status='settled'
 AND settled_at >= %(from)s::timestamptz AND settled_at < %(to)s::timestamptz
 AND (%(brand)s::text IS NULL OR brand_id=%(brand)s::text)
 AND (%(provider)s::text IS NULL OR provider_id=%(provider)s::text) GROUP BY 1)
SELECT days.day, coalesce(totals.ggr,0) AS ggr FROM days LEFT JOIN totals USING(day) ORDER BY 1
