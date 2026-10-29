-- Idempotency keys must be unique per customer, not globally.
DROP INDEX "Order_idempotencyKey_key";

CREATE UNIQUE INDEX "Order_userId_idempotencyKey_key" ON "Order"("userId", "idempotencyKey");
