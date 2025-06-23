-- CRITICAL PERFORMANCE INDEXES FOR NUMERICALZ
-- These indexes will dramatically improve query performance
-- Run these commands in your PostgreSQL database

-- Client table indexes (most critical)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_is_active ON "Client"("isActive");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_company_type ON "Client"("companyType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_assigned_user ON "Client"("assignedUserId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_ltd_assigned ON "Client"("ltdCompanyAssignedUserId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_nonltd_assigned ON "Client"("nonLtdCompanyAssignedUserId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_vat_assigned ON "Client"("vatAssignedUserId");

-- User table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_is_active ON "User"("isActive");

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_active_type ON "Client"("isActive", "companyType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_active_name ON "Client"("isActive", "companyName");

-- Search optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_company_name_text ON "Client" USING gin(to_tsvector('english', "companyName"));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_contact_name_text ON "Client" USING gin(to_tsvector('english', "contactName"));

-- Additional performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_code ON "Client"("clientCode");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_company_number ON "Client"("companyNumber");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_vat_enabled ON "Client"("isVatEnabled");

-- User role and email indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role ON "User"("role");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email ON "User"("email");

-- VAT Quarter indexes for VAT workflow
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vat_quarter_client ON "VATQuarter"("clientId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vat_quarter_assigned ON "VATQuarter"("assignedUserId");

-- Activity log indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_client ON "ActivityLog"("clientId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_user ON "ActivityLog"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_created ON "ActivityLog"("createdAt");

-- Analyze tables after index creation
ANALYZE "Client";
ANALYZE "User";
ANALYZE "VATQuarter";
ANALYZE "ActivityLog"; 