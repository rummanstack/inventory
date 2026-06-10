# 7-Day Multi-Tenant Plan

This plan turns the current system into a configurable product that can serve multiple businesses without changing code for each client.

## Day 1: Tenant Foundation
- Add `tenant_id` to all business data models.
- Create the main tenant record structure.
- Keep the current client as the first tenant.
- Make sure all reads and writes are tenant-scoped.

## Day 2: Tenant Settings
- Add a tenant settings table.
- Store business name, logo, address, contact info, and branding colors.
- Add currency, locale, and date-format settings.
- Load these settings dynamically in the UI.

## Day 3: User and Role System
- Make users belong to a tenant.
- Add proper role-based access control per tenant.
- Keep `super_admin`, `admin`, `manager`, and `operator` as real permissioned roles.
- Add a user profile page with name, email, role, and status.

## Day 4: Permissions and Access Control
- Enforce permissions on the backend everywhere.
- Mirror the same rules in the frontend.
- Add route-level and action-level access checks.
- Make role defaults configurable per tenant.

## Day 5: Branding and UI Configuration
- Use tenant logo and business name in the login page, sidebar, and header.
- Apply tenant colors to key UI accents.
- Make print/PDF headers use tenant branding.
- Keep the current premium light design style.

## Day 6: Trash and Backup
- Add soft delete for important records.
- Add a trash view with restore and permanent delete for super admin.
- Add automatic database backup support.
- Add backup history or download access in admin tools.

## Day 7: Final Polish and QA
- Review all tenant-configured screens.
- Check permissions, branding, and data isolation.
- Verify no cross-tenant data leakage.
- Clean up any rough edges in design, copy, and error handling.

## Design Suggestions
- Keep the interface clean, light, and premium.
- Make tenant branding visible but not overpowering.
- Use the same shell across clients, with config-driven identity.
- Avoid hardcoded business text anywhere that should vary by tenant.

## Functional Suggestions
- Treat tenant settings as the source of truth for labels and branding.
- Keep the current client workflow unchanged.
- Add configurability before adding more features.
- Make tenant isolation strict from the start.

