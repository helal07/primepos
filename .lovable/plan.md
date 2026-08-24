# Fix warranty navigation, eligibility, and Laravel schema

## Goal
Make warranty setup part of the Products menu while preserving Warranty Manager as a separately licensed capability, and repair the Laravel/MySQL schema mismatch that prevents warranty creation.

## Changes

1. **Navigation and route entitlement**
   - Move the **Warranties** link from the standalone Warranty Manager group into the **Product** group.
   - Keep that individual menu item gated by the `warranty` entitlement even though its visual location is under Products.
   - Leave **Warranty Claims** in the separate Warranty Manager group and keep its existing module gate.
   - Preserve the `/warranties` route’s `ModuleGate module="warranty"` protection so direct URLs cannot bypass plan eligibility.

2. **Product warranty controls**
   - Read the tenant’s enabled modules in the product add/edit page.
   - Render and submit `has_warranty`, `warranty_duration`, and `warranty_type` only when the Warranty module is enabled.
   - For ineligible tenants, hide the warranty toggle/details and force warranty values to disabled/null in submitted product data, preventing stale or crafted UI state from enabling the feature.
   - Add the equivalent Laravel-side entitlement enforcement for product warranty fields so direct API calls cannot bypass the UI.

3. **Warranty table contract repair**
   - Add a focused Laravel migration that converts the legacy `warranties` table from issued-warranty requirements to the warranty-type contract used by the current page:
     - make legacy issuance fields such as `warranty_no`, `start_date`, and `end_date` nullable;
     - retain/add `name`, `description`, `duration`, `duration_type`, and `is_active` with appropriate defaults/nullability.
   - Align the Warranty model casts/default behavior and REST registry search/sort/filter fields with the actual warranty-type UI.
   - Keep the migration idempotent and safe for existing MySQL data.

4. **Regression coverage and verification**
   - Add backend tests for successful warranty creation and denial when the Warranty module is unavailable.
   - Verify frontend type/build status and run focused Laravel tests.
   - Check the live preview’s Products navigation and product form visibility for the available auth state.

## Technical note
The current page creates warranty definitions (`name`, `duration`, `duration_type`), but the original Laravel table requires issued-warranty fields (`warranty_no`, `start_date`, `end_date`). The repair preserves existing columns/data while making the schema compatible with the implemented definition workflow.
