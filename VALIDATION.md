# Validation

## Clean setup

- Application initialization uses `createEmptyState` for local development, a missing MongoDB document and the public-page fallback. All business and content arrays start empty.
- Removed the supplied student/financial seed, specialized source-workbook extraction script, local demo JSON, prepared import payload, seed command and fixed historical reconciliation table.
- Regression fixtures use invented learner identities and independent transactions; application code never imports test fixtures.
- Original source workbook outside the project is unchanged.

## Coverage

Automated checks cover empty initialization, tuition allocation and duplicate protection, billing adjustments, transaction editing/voiding, purchase and sale accounting, belt results, date handling, chart scaling, idempotent generic imports and article/media sanitization.

All 43 tests and the production build pass after removing the supplied dataset. A project source scan found no remaining supplied student names, fixed source totals or old seed references. Generated bundles were cleared and rebuilt.

Browser behavior previously checked includes rich text formatting, image/video insertion, HTML submission and video thumbnails. Cloudinary uploads are not triggered by automated checks.

## Netlify server adapter

The supplied production log showed a successful Next.js build followed by uploading `.next` with zero server functions and no adapter hooks. The project now explicitly installs `@netlify/plugin-nextjs` and declares it in `netlify.toml`. The application production build passes; adapter packaging and live route behavior must be confirmed on the subsequent Netlify deployment.

## Searchable selects and unpaid learners

- All application select controls now share a react-select wrapper with label/value search, Vietnamese accent normalization, form values and keyboard navigation. Browser QA on a temporary fixture verified searching by a value substring, choosing with Enter, submitting the original value and searching an accented label with unaccented input. The fixture was removed; no database writes were made.
- The monthly unpaid list separates outstanding bills from eligible learners without bills, excludes paid/waived bills and future learners, and preserves outstanding debts for inactive learners. Automated coverage checks these rules.

## Inactive learner billing visibility

- Both monthly tables default to active learners; an explicit toggle reveals inactive learners' existing history/debts. Inactive learners without bills never appear as unbilled, regardless of their recorded leaving month.
- New tuition selection excludes inactive learners unless they have an existing outstanding bill for the selected month. Existing paid records are preserved; no database mutations were made to repair display logic.
- Regression coverage includes the month of departure, earlier/later months, unpaid history selection and excluding settled inactive records.

## Session checks, notifications, class rosters and table sorting

- All 49 automated tests and the production build pass. Added sorting regressions for numeric VND, cross-year dates/months, names and selected cell values.
- The actual local session API was checked with missing, valid, expired and incorrectly signed JWTs: 401 / 200 / 401 / 401, all with no-store responses. No tokens were printed and no database writes were performed.
- Browser QA used a temporary isolated dashboard fixture. Verified descending learner order, class name cells, roster restricted to the chosen class, error toast visible above an open dialog while retaining form values, and redirect to login with an expiry notification when a simulated focus recheck returned 401. Temporary QA routes were removed before the final build.

## Financial report redesign and class card actions

- Replaced overlapping report summaries and the tuition/debt table with all-time revenue/cost/profit totals and a matching sortable monthly breakdown. Optional monthly scope uses accounting month consistently. Regression checks reconcile monthly rows to totals, ignore voids and cover legacy profit and differing transaction dates.
- Browser QA with synthetic data verified all-time totals, monthly scope (including a negative profit), and equal-width stacked class actions with a measured 12px gap. Temporary fixtures were removed, and no database changes were made.
