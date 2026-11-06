SELECT coalesce(sum(stake_minor),0) AS stakes,
       coalesce(sum(payout_minor),0) AS payouts,
       coalesce(sum(stake_minor-payout_minor),0) AS ggr,
       count(DISTINCT player_id) AS players
FROM opslens_private.transactions
WHERE status='settled' AND settled_at >= %(from)s::timestamptz
 AND settled_at < %(to)s::timestamptz
 AND (%(brand)s::text IS NULL OR brand_id=%(brand)s::text)
 AND (%(provider)s::text IS NULL OR provider_id=%(provider)s::text)
