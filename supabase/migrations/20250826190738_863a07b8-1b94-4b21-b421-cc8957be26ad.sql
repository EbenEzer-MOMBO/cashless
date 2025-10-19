-- Drop participant-facing connection tables
DROP TABLE IF EXISTS client_wallet_transactions CASCADE;
DROP TABLE IF EXISTS client_connections CASCADE;

-- Reset all participant balances to zero
UPDATE participants SET balance = 0;