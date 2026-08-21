-- CreateIndex
CREATE INDEX "customer_notes_customerId_idx" ON "customer_notes"("customerId");

-- CreateIndex
CREATE INDEX "customers_hangKhachHang_idx" ON "customers"("hangKhachHang");

-- CreateIndex
CREATE INDEX "customers_createdAt_idx" ON "customers"("createdAt");

-- CreateIndex
CREATE INDEX "debts_loai_idx" ON "debts"("loai");

-- CreateIndex
CREATE INDEX "debts_ngayDenHan_idx" ON "debts"("ngayDenHan");

-- CreateIndex
CREATE INDEX "income_expenses_nguoiTaoId_idx" ON "income_expenses"("nguoiTaoId");

-- CreateIndex
CREATE INDEX "income_expenses_createdAt_idx" ON "income_expenses"("createdAt");

-- CreateIndex
CREATE INDEX "income_expenses_loai_idx" ON "income_expenses"("loai");

-- CreateIndex
CREATE INDEX "income_expenses_danhMuc_idx" ON "income_expenses"("danhMuc");

-- CreateIndex
CREATE INDEX "inventory_transactions_productId_idx" ON "inventory_transactions"("productId");

-- CreateIndex
CREATE INDEX "inventory_transactions_nguoiThucHienId_idx" ON "inventory_transactions"("nguoiThucHienId");

-- CreateIndex
CREATE INDEX "inventory_transactions_createdAt_idx" ON "inventory_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "inventory_transactions_loai_idx" ON "inventory_transactions"("loai");

-- CreateIndex
CREATE INDEX "invoices_nguoiTaoId_idx" ON "invoices"("nguoiTaoId");

-- CreateIndex
CREATE INDEX "invoices_createdAt_idx" ON "invoices"("createdAt");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "orders_khachHangId_idx" ON "orders"("khachHangId");

-- CreateIndex
CREATE INDEX "orders_nhanVienId_idx" ON "orders"("nhanVienId");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "orders_trangThai_createdAt_idx" ON "orders"("trangThai", "createdAt");

-- CreateIndex
CREATE INDEX "payment_transactions_orderId_idx" ON "payment_transactions"("orderId");

-- CreateIndex
CREATE INDEX "payment_transactions_trangThaiDoiSoat_idx" ON "payment_transactions"("trangThaiDoiSoat");

-- CreateIndex
CREATE INDEX "payment_transactions_createdAt_idx" ON "payment_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "products_trangThai_idx" ON "products"("trangThai");

-- CreateIndex
CREATE INDEX "products_danhMuc_idx" ON "products"("danhMuc");

-- CreateIndex
CREATE INDEX "products_nhaCungCap_idx" ON "products"("nhaCungCap");

-- CreateIndex
CREATE INDEX "products_createdAt_idx" ON "products"("createdAt");
