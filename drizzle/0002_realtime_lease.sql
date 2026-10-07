CREATE TABLE `realtime_leases` (
  `id` text PRIMARY KEY NOT NULL,
  `owner` text NOT NULL,
  `expires_at` integer NOT NULL
);
