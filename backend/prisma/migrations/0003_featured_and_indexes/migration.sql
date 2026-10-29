-- Featured products for the storefront home page.
ALTER TABLE "Product" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Product_featured_idx" ON "Product"("featured");

-- Faster "open orders per customer" checks and refund-webhook lookups.
DROP INDEX IF EXISTS "Order_userId_idx";
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");
CREATE INDEX "Order_razorpayPaymentId_idx" ON "Order"("razorpayPaymentId");

-- Distinguish normal refresh-token rotation from revocation (logout, reuse detection).
ALTER TABLE "RefreshToken" ADD COLUMN "rotatedAt" TIMESTAMP(3);
