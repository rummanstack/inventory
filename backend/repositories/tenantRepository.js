export function mapTenant(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    email: row.email,
    plan: row.plan,
    status: row.status,
    logoUrl: row.logo_url || null,
    address: row.address || null,
    taxRate: Number(row.tax_rate || 0),
    loyaltyEnabled: row.loyalty_enabled === true || row.loyalty_enabled === 'true' || row.loyalty_enabled === 1,
    loyaltyPointsPer100: Number(row.loyalty_points_per_100 || 0),
    loyaltyPointValue: Number(row.loyalty_point_value || 0),
    businessType: row.business_type || 'ELECTRONICS',
    sellerType: row.seller_type || 'DEALER',
    phone: row.phone || '',
    tradeLicenseNumber: row.trade_license_number || '',
    binNumber: row.bin_number || '',
    tinNumber: row.tin_number || '',
    whatsappPhone: row.whatsapp_phone || '',
    district: row.district || '',
    websiteUrl: row.website_url || '',
    facebookUrl: row.facebook_url || '',
    bankName: row.bank_name || '',
    bankAccountName: row.bank_account_name || '',
    bankAccountNumber: row.bank_account_number || '',
    bankBranch: row.bank_branch || '',
    bkashNumber: row.bkash_number || '',
    nagadNumber: row.nagad_number || '',
    invoiceFooterNote: row.invoice_footer_note || '',
    signatureImageUrl: row.signature_image_url || '',
    receiptFooterMessage: row.receipt_footer_message || '',
    drugLicenseNumber: row.drug_license_number || '',
    dealerRegistrationNumber: row.dealer_registration_number || '',
    tradeLicenseFileUrl: row.trade_license_file_url || '',
    binCertificateFileUrl: row.bin_certificate_file_url || '',
    tinCertificateFileUrl: row.tin_certificate_file_url || '',
    drugLicenseFileUrl: row.drug_license_file_url || '',
    dealerRegistrationFileUrl: row.dealer_registration_file_url || '',
    createdAt: row.created_at,
  };
}

export async function findTenantBySlug(client, slug) {
  const result = await client.query("SELECT * FROM tenants WHERE slug = $1 LIMIT 1", [slug]);
  return mapTenant(result.rows[0]);
}

export async function findTenantById(client, id) {
  const result = await client.query("SELECT * FROM tenants WHERE id = $1 LIMIT 1", [id]);
  return mapTenant(result.rows[0]);
}

export async function listTenants(client) {
  const result = await client.query("SELECT * FROM tenants ORDER BY created_at ASC");
  return result.rows.map(mapTenant);
}

export async function countTenants(client) {
  const result = await client.query("SELECT COUNT(*)::INTEGER AS count FROM tenants");
  return result.rows[0].count;
}

export async function insertTenant(client, tenant) {
  const result = await client.query(
    `INSERT INTO tenants (id, name, slug, email, plan, status, logo_url, address, tax_rate, loyalty_enabled, loyalty_points_per_100, loyalty_point_value, business_type, seller_type, phone)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      tenant.id,
      tenant.name,
      tenant.slug,
      tenant.email,
      tenant.plan || "starter",
      tenant.status || "active",
      tenant.logoUrl || null,
      tenant.address || null,
      tenant.taxRate ?? 0,
      tenant.loyaltyEnabled ?? false,
      tenant.loyaltyPointsPer100 ?? 1,
      tenant.loyaltyPointValue ?? 1,
      tenant.businessType || "ELECTRONICS",
      tenant.sellerType || "DEALER",
      tenant.phone || "",
    ],
  );
  return mapTenant(result.rows[0]);
}

export async function updateTenant(client, tenant) {
  const result = await client.query(
    `UPDATE tenants
     SET name = $2, email = $3, plan = $4, logo_url = $5, address = $6, tax_rate = $7,
         loyalty_enabled = $8, loyalty_points_per_100 = $9, loyalty_point_value = $10, business_type = $11,
         seller_type = $12, phone = $13, trade_license_number = $14, bin_number = $15, tin_number = $16,
         whatsapp_phone = $17, district = $18, website_url = $19, facebook_url = $20, bank_name = $21,
         bank_account_name = $22, bank_account_number = $23, bank_branch = $24, bkash_number = $25,
         nagad_number = $26, invoice_footer_note = $27, signature_image_url = $28, receipt_footer_message = $29,
         drug_license_number = $30, dealer_registration_number = $31, trade_license_file_url = $32,
         bin_certificate_file_url = $33, tin_certificate_file_url = $34, drug_license_file_url = $35,
         dealer_registration_file_url = $36
     WHERE id = $1
     RETURNING *`,
    [
      tenant.id,
      tenant.name,
      tenant.email,
      tenant.plan,
      tenant.logoUrl || null,
      tenant.address || null,
      tenant.taxRate ?? 0,
      tenant.loyaltyEnabled ?? false,
      tenant.loyaltyPointsPer100 ?? 1,
      tenant.loyaltyPointValue ?? 1,
      tenant.businessType || "ELECTRONICS",
      tenant.sellerType || "DEALER",
      tenant.phone || "",
      tenant.tradeLicenseNumber || "",
      tenant.binNumber || "",
      tenant.tinNumber || "",
      tenant.whatsappPhone || "",
      tenant.district || "",
      tenant.websiteUrl || "",
      tenant.facebookUrl || "",
      tenant.bankName || "",
      tenant.bankAccountName || "",
      tenant.bankAccountNumber || "",
      tenant.bankBranch || "",
      tenant.bkashNumber || "",
      tenant.nagadNumber || "",
      tenant.invoiceFooterNote || "",
      tenant.signatureImageUrl || "",
      tenant.receiptFooterMessage || "",
      tenant.drugLicenseNumber || "",
      tenant.dealerRegistrationNumber || "",
      tenant.tradeLicenseFileUrl || "",
      tenant.binCertificateFileUrl || "",
      tenant.tinCertificateFileUrl || "",
      tenant.drugLicenseFileUrl || "",
      tenant.dealerRegistrationFileUrl || "",
    ],
  );
  return mapTenant(result.rows[0]);
}

// Self-service registrations are tenants in 'pending'/'rejected' status; the owner
// user (first super_admin) is joined in so the platform admin can contact them.
export async function listRegistrationTenants(client) {
  const result = await client.query(
    `SELECT t.*, owner.name AS owner_name, owner.email AS owner_email
     FROM tenants t
     LEFT JOIN LATERAL (
       SELECT u.name, u.email
       FROM users u
       WHERE u.tenant_id = t.id AND u.role = 'super_admin' AND u.deleted_at IS NULL
       ORDER BY u.created_at ASC
       LIMIT 1
     ) owner ON TRUE
     WHERE t.status IN ('pending', 'rejected')
     ORDER BY t.created_at DESC`,
  );
  return result.rows.map((row) => ({
    ...mapTenant(row),
    ownerName: row.owner_name || '',
    ownerEmail: row.owner_email || '',
  }));
}

export async function setTenantStatus(client, tenantId, status) {
  const result = await client.query("UPDATE tenants SET status = $2 WHERE id = $1 RETURNING *", [tenantId, status]);
  return mapTenant(result.rows[0]);
}
