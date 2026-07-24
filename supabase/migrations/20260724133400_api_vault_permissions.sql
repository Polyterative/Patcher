-- Vault's trigger functions execute as the calling role. The managed postgres
-- role owns the API key minting functions, so it needs pgSodium's restricted
-- key-id role to encrypt and decrypt the API pepper without receiving raw-key
-- access through pgsodium_keyholder or key-management access through
-- pgsodium_keymaker.
grant pgsodium_keyiduser to postgres;
