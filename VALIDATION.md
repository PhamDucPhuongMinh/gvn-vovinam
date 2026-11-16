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
