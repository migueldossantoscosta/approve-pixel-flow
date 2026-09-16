-- The app is now a static SPA (GitHub Pages) with no server to hold the
-- service-role key needed to sign private storage URLs. Make the bucket
-- public-read instead: object paths are random UUIDs, so only someone with
-- the exact path (reachable via a share-token review link) can fetch a file.
-- Existing owner-scoped INSERT/UPDATE/DELETE policies still gate all writes.
update storage.buckets set public = true where id = 'deliverables';
