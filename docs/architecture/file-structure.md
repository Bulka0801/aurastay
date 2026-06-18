# AuraStay File Structure

Generated from the local repository. It intentionally excludes `.git`, `node_modules`, and `.next`; local metadata such as `.env.local`, `.DS_Store`, `supabase/.temp`, and backups are listed but their contents are not copied.

## Structurizr

- Primary Structurizr workspace: `docs/structurizr/workspace.dsl`
- Same full generated workspace copy: `docs/structurizr/workspace-full.dsl`
- Lightweight check-in-only workspace: `docs/structurizr/check-in-lite.dsl`
- Views: `System_Context`, `Containers`, `File_Structure_Full`, `Root_File_Map`, `App_Router_File_Map`, `Components_File_Map`, `Lib_Hooks_File_Map`, `Database_Scripts_File_Map`, `Tests_Docs_File_Map`, `CheckIn_Render_And_Imports`, `CheckIn_Submit_Flow`

## Tree

```text
.
|-- .qodo/
|   |-- agents/
|   |-- workflows/
|   `-- .DS_Store
|-- app/
|   |-- dashboard/
|   |   |-- admin/
|   |   |   |-- activity/
|   |   |   |   |-- activity-filters.tsx
|   |   |   |   `-- page.tsx
|   |   |   |-- settings/
|   |   |   |   |-- actions.ts
|   |   |   |   `-- page.tsx
|   |   |   |-- users/
|   |   |   |   |-- [id]/
|   |   |   |   |   `-- page.tsx
|   |   |   |   |-- new/
|   |   |   |   |   `-- page.tsx
|   |   |   |   |-- actions.ts
|   |   |   |   |-- loading.tsx
|   |   |   |   `-- page.tsx
|   |   |   |-- .DS_Store
|   |   |   `-- page.tsx
|   |   |-- finance/
|   |   |   `-- page.tsx
|   |   |-- front-desk/
|   |   |   |-- check-in/
|   |   |   |   `-- [id]/
|   |   |   |       `-- page.tsx
|   |   |   |-- check-out/
|   |   |   |   `-- [id]/
|   |   |   |       `-- page.tsx
|   |   |   |-- .DS_Store
|   |   |   `-- page.tsx
|   |   |-- guests/
|   |   |   |-- [id]/
|   |   |   |   `-- page.tsx
|   |   |   `-- page.tsx
|   |   |-- housekeeping/
|   |   |   `-- page.tsx
|   |   |-- maintenance/
|   |   |   `-- page.tsx
|   |   |-- profile/
|   |   |   `-- page.tsx
|   |   |-- reports/
|   |   |   `-- page.tsx
|   |   |-- reservations/
|   |   |   |-- [id]/
|   |   |   |   |-- edit/
|   |   |   |   |   `-- page.tsx
|   |   |   |   `-- page.tsx
|   |   |   |-- new/
|   |   |   |   `-- page.tsx
|   |   |   `-- page.tsx
|   |   |-- room-rack/
|   |   |   |-- loading.tsx
|   |   |   `-- page.tsx
|   |   |-- rooms/
|   |   |   `-- page.tsx
|   |   |-- .DS_Store
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- login/
|   |   `-- page.tsx
|   |-- .DS_Store
|   |-- globals.css
|   |-- layout.tsx
|   `-- page.tsx
|-- backups/
|   `-- aura_stay_full_20260608_234312.sql
|-- components/
|   |-- admin/
|   |   |-- settings/
|   |   |   `-- admin-settings-client.tsx
|   |   |-- edit-user-form.tsx
|   |   |-- new-user-form.tsx
|   |   `-- users-table.tsx
|   |-- dashboards/
|   |   |-- admin-dashboard.tsx
|   |   |-- dashboard-primitives.tsx
|   |   |-- front-desk-dashboard.tsx
|   |   |-- housekeeping-dashboard.tsx
|   |   |-- maintenance-dashboard.tsx
|   |   |-- manager-charts.tsx
|   |   `-- manager-dashboard.tsx
|   |-- data-table/
|   |   |-- column-header-menu.tsx
|   |   |-- filter-utils.ts
|   |   |-- table-logic.ts
|   |   `-- types.ts
|   |-- finance/
|   |   |-- folios-table.tsx
|   |   `-- payments-table.tsx
|   |-- front-desk/
|   |   |-- arrivals-tab.tsx
|   |   |-- check-in-form.tsx
|   |   |-- check-out-form.tsx
|   |   |-- departures-tab.tsx
|   |   `-- in-house-tab.tsx
|   |-- guests/
|   |   `-- guests-client.tsx
|   |-- housekeeping/
|   |   |-- housekeeping-client.tsx
|   |   |-- housekeeping-kanban.tsx
|   |   |-- room-status-grid.tsx
|   |   `-- tasks-list.tsx
|   |-- maintenance/
|   |   |-- maintenance-client.tsx
|   |   `-- maintenance-list.tsx
|   |-- profile/
|   |   `-- profile-settings.tsx
|   |-- reports/
|   |   |-- occupancy-report.tsx
|   |   |-- reports-client.tsx
|   |   |-- reservations-report.tsx
|   |   `-- revenue-report.tsx
|   |-- reservations/
|   |   |-- steps/
|   |   |   |-- step-dates-guests.tsx
|   |   |   |-- step-guest-confirm.tsx
|   |   |   `-- step-room-rate.tsx
|   |   |-- ui/
|   |   |   |-- guest-lookup-input.tsx
|   |   |   `-- pricing-summary.tsx
|   |   |-- .DS_Store
|   |   |-- edit-reservation-form.tsx
|   |   |-- folio-actions.tsx
|   |   |-- form-context.tsx
|   |   |-- new-reservation-form.tsx
|   |   |-- reservation-actions.tsx
|   |   |-- reservation-status-timeline.tsx
|   |   |-- reservations-table.tsx
|   |   `-- room-move-note.tsx
|   |-- room-rack/
|   |   |-- confirm-move-dialog.tsx
|   |   |-- reservation-block.tsx
|   |   |-- reservation-details-panel.tsx
|   |   |-- room-rack-client.tsx
|   |   |-- room-rack-grid.tsx
|   |   |-- room-rack-legend.tsx
|   |   `-- room-rack-toolbar.tsx
|   |-- rooms/
|   |   |-- room-class-filter.tsx
|   |   `-- room-type-cards.tsx
|   |-- ui/
|   |   |-- accordion.tsx
|   |   |-- alert-dialog.tsx
|   |   |-- alert.tsx
|   |   |-- aspect-ratio.tsx
|   |   |-- avatar.tsx
|   |   |-- badge.tsx
|   |   |-- breadcrumb.tsx
|   |   |-- button-group.tsx
|   |   |-- button.tsx
|   |   |-- calendar.tsx
|   |   |-- card.tsx
|   |   |-- carousel.tsx
|   |   |-- chart.tsx
|   |   |-- checkbox.tsx
|   |   |-- collapsible.tsx
|   |   |-- command.tsx
|   |   |-- context-menu.tsx
|   |   |-- dialog.tsx
|   |   |-- drawer.tsx
|   |   |-- dropdown-menu.tsx
|   |   |-- empty.tsx
|   |   |-- field.tsx
|   |   |-- form.tsx
|   |   |-- hover-card.tsx
|   |   |-- input-group.tsx
|   |   |-- input-otp.tsx
|   |   |-- input.tsx
|   |   |-- item.tsx
|   |   |-- kbd.tsx
|   |   |-- label.tsx
|   |   |-- menubar.tsx
|   |   |-- navigation-menu.tsx
|   |   |-- pagination.tsx
|   |   |-- popover.tsx
|   |   |-- progress.tsx
|   |   |-- radio-group.tsx
|   |   |-- resizable.tsx
|   |   |-- scroll-area.tsx
|   |   |-- select.tsx
|   |   |-- separator.tsx
|   |   |-- sheet.tsx
|   |   |-- sidebar.tsx
|   |   |-- skeleton.tsx
|   |   |-- slider.tsx
|   |   |-- sonner.tsx
|   |   |-- spinner.tsx
|   |   |-- switch.tsx
|   |   |-- table.tsx
|   |   |-- tabs.tsx
|   |   |-- textarea.tsx
|   |   |-- toast.tsx
|   |   |-- toaster.tsx
|   |   |-- toggle-group.tsx
|   |   |-- toggle.tsx
|   |   |-- tooltip.tsx
|   |   |-- use-mobile.tsx
|   |   `-- use-toast.ts
|   |-- dashboard-header.tsx
|   |-- dashboard-nav.tsx
|   |-- data-table.tsx
|   |-- form-field-wrapper.tsx
|   |-- room-status-grid.tsx
|   |-- stat-card.tsx
|   `-- theme-provider.tsx
|-- docs/
|   |-- architecture/
|   |   `-- file-structure.md
|   `-- structurizr/
|       |-- check-in-lite.dsl
|       |-- workspace-full.dsl
|       `-- workspace.dsl
|-- hooks/
|   |-- table-url-state.ts
|   |-- table-url-sync-utils.ts
|   |-- use-media-query.ts
|   |-- use-mobile.ts
|   |-- use-table-url-sync.ts
|   `-- use-toast.ts
|-- lib/
|   |-- i18n/
|   |   `-- uk.ts
|   |-- reports/
|   |   `-- hotel-reporting.ts
|   |-- room-rack/
|   |   |-- availability.ts
|   |   |-- date-utils.ts
|   |   |-- errors.ts
|   |   |-- filters.ts
|   |   |-- kpi.ts
|   |   |-- pricing.ts
|   |   `-- types.ts
|   |-- rooms/
|   |   `-- availability.ts
|   |-- rules/
|   |   |-- payments.ts
|   |   |-- prepayment.ts
|   |   `-- transitions.ts
|   |-- supabase/
|   |   |-- client.ts
|   |   |-- proxy.ts
|   |   `-- server.ts
|   |-- audit-log.ts
|   |-- format.ts
|   |-- hotel-settings.ts
|   |-- localization.ts
|   |-- types.ts
|   |-- utils.ts
|   `-- validation.ts
|-- public/
|   |-- placeholder-user.jpg
|   |-- placeholder.jpg
|   `-- placeholder.svg
|-- scripts/
|   |-- legacy/
|   |   |-- 20260525_adapt_finance_to_payment_folio.sql
|   |   |-- 20260525_add_payments_folio_id.sql
|   |   |-- 20260525_backfill_folios_and_charges.sql
|   |   |-- 20260525_create_legacy_folios_view.sql
|   |   |-- 20260525_fix_reservation_folio_trigger.sql
|   |   |-- 20260525_normalize_payment_method.sql
|   |   |-- 20260525_repair_legacy_folio_totals.sql
|   |   |-- 20260525_repair_payment_folio_links.sql
|   |   |-- 20260525_set_payment_folio_trigger.sql
|   |   |-- 20260525_validate_reservation_checkin.sql
|   |   |-- 202606_manual_write_off_cancelled_no_show_balances.sql
|   |   `-- 20260609_reconcile_business_rule_history.sql
|   |-- 000_hms_foundation_functions.sql
|   |-- 001_create_schema.sql
|   |-- 001-create-database-schema.sql
|   |-- 002_enable_rls.sql
|   |-- 002-create-rls-policies.sql
|   |-- 003_create_triggers.sql
|   |-- 003-seed-initial-data.sql
|   |-- 004_seed_data.sql
|   |-- 005_housekeeping_profile_access.sql
|   |-- 006_housekeeping_task_rls.sql
|   |-- 007_allow_front_desk_checkout_tasks.sql
|   |-- 008_reservation_integrity_triggers.sql
|   |-- 009_normalize_maintenance_priority.sql
|   |-- 010_room_availability_guards.sql
|   |-- 011_profile_updated_at_trigger.sql
|   |-- 012_remove_rate_plan_advance_days.sql
|   |-- 013_guest_archiving.sql
|   |-- 014_auto_refund_cancel_no_show.sql
|   |-- 015_iban_payment_verification.sql
|   |-- 016_reservation_cancellation_audit.sql
|   |-- 017_finance_schema.sql
|   |-- 018_finance_backfill.sql
|   |-- 019_finance_logic.sql
|   |-- 020_finance_views_verification.sql
|   |-- 021_guest_normalization_and_identity_guards.sql
|   |-- 022_post_migration_smoke_checks.sql
|   |-- 023_auto_confirm_paid_reservations.sql
|   |-- 024_business_rules_rebuild.sql
|   |-- 025_business_rules_verification.sql
|   |-- 026_room_state_dimensions.sql
|   |-- 027_room_state_dimensions_verification.sql
|   |-- 028_closed_folio_finance_guards.sql
|   |-- 029_service_room_state_consistency.sql
|   |-- check-structurizr-dsl.mjs
|   `-- generate-architecture-docs.mjs
|-- styles/
|   `-- globals.css
|-- supabase/
|   |-- .temp/
|   |   |-- cli-latest
|   |   |-- gotrue-version
|   |   |-- linked-project.json
|   |   |-- pooler-url
|   |   |-- postgres-version
|   |   |-- project-ref
|   |   |-- rest-version
|   |   |-- storage-migration
|   |   `-- storage-version
|   |-- migrations/
|   |   |-- 005_room_rack_and_rules.sql
|   |   `-- 202605010005_room_rack_and_rules.sql
|   |-- .gitignore
|   `-- config.toml
|-- tests/
|   |-- support/
|   |   |-- create-headless-table.ts
|   |   |-- reservations-table-model.ts
|   |   |-- reservations.fixture.ts
|   |   `-- room-rack.fixture.ts
|   |-- data-table-test-matrix.md
|   |-- data-table.integration.test.ts
|   |-- data-table.logic.test.ts
|   |-- data-table.url-state.test.ts
|   |-- hotel-reporting.test.ts
|   |-- LOCALIZATION_REPORT_UA.md
|   |-- localization.test.ts
|   |-- payments.test.ts
|   |-- prepayment.test.ts
|   |-- reservations-page.test.ts
|   |-- room-availability.test.ts
|   |-- room-rack.errors.test.ts
|   |-- room-rack.filters.test.ts
|   |-- room-rack.kpi.test.ts
|   |-- room-rack.pricing.test.ts
|   |-- transitions.test.ts
|   `-- validation.test.ts
|-- .DS_Store
|-- .env.local
|-- .gitignore
|-- .pnpm-lock.yaml
|-- appendix-code-listing.md
|-- components.json
|-- next-env.d.ts
|-- next.config.mjs
|-- package-lock.json
|-- package.json
|-- postcss.config.mjs
|-- proxy.ts
|-- settings.json
|-- tsconfig.json
|-- tsconfig.tsbuildinfo
`-- vitest.config.ts
```

## Folders

- `.`: Корінь проекту: конфігурація, залежності, документація і головні директорії застосунку.
- `.qodo/`: Локальна конфігурація Qodo/агентів; не бере участі у runtime Next.js.
- `.qodo/agents/`: Налаштування агентів Qodo.
- `.qodo/workflows/`: Налаштування workflow Qodo.
- `app/`: Next.js App Router: маршрути, layouts, loading states і серверні сторінки.
- `app/dashboard/`: Захищена dashboard-зона готельної системи.
- `app/dashboard/admin/`: Адміністративні сторінки.
- `app/dashboard/admin/activity/`: Журнал активності та фільтри audit log.
- `app/dashboard/admin/settings/`: Налаштування готелю і server actions для них.
- `app/dashboard/admin/users/`: Керування користувачами.
- `app/dashboard/admin/users/[id]/`: Редагування конкретного користувача.
- `app/dashboard/admin/users/new/`: Створення нового користувача.
- `app/dashboard/finance/`: Фінансовий розділ.
- `app/dashboard/front-desk/`: Front desk: заїзди, виїзди, гості в готелі.
- `app/dashboard/front-desk/check-in/`: Маршрути check-in.
- `app/dashboard/front-desk/check-in/[id]/`: Check-in конкретного бронювання.
- `app/dashboard/front-desk/check-out/`: Маршрути check-out.
- `app/dashboard/front-desk/check-out/[id]/`: Check-out конкретного бронювання.
- `app/dashboard/guests/`: Сторінки гостей.
- `app/dashboard/guests/[id]/`: Деталі конкретного гостя.
- `app/dashboard/housekeeping/`: Housekeeping сторінка.
- `app/dashboard/maintenance/`: Maintenance сторінка.
- `app/dashboard/profile/`: Профіль користувача.
- `app/dashboard/reports/`: Звіти.
- `app/dashboard/reservations/`: Маршрути бронювань.
- `app/dashboard/reservations/[id]/`: Деталі конкретного бронювання.
- `app/dashboard/reservations/[id]/edit/`: Редагування бронювання.
- `app/dashboard/reservations/new/`: Створення бронювання.
- `app/dashboard/room-rack/`: Room rack календар/сітка номерів.
- `app/dashboard/rooms/`: Керування номерами.
- `app/login/`: Сторінка входу.
- `backups/`: Локальні SQL backup-файли.
- `components/`: React-компоненти, розбиті за доменами і UI-системою.
- `components/admin/`: Адмінські форми, таблиці та клієнти.
- `components/admin/settings/`: Клієнт налаштувань адміністратора.
- `components/dashboards/`: Dashboard-віджети для ролей і спільні primitives.
- `components/data-table/`: Логіка таблиць, фільтрів і меню колонок.
- `components/finance/`: Фінансові таблиці.
- `components/front-desk/`: Компоненти front desk workflow.
- `components/guests/`: Компоненти для гостей.
- `components/housekeeping/`: Компоненти прибирання і станів номерів.
- `components/maintenance/`: Компоненти технічного обслуговування.
- `components/profile/`: Компоненти профілю.
- `components/reports/`: Компоненти звітності.
- `components/reservations/`: Компоненти бронювань.
- `components/reservations/steps/`: Кроки multi-step форми бронювання.
- `components/reservations/ui/`: Малі UI-компоненти для бронювань.
- `components/room-rack/`: Компоненти календарної сітки номерів.
- `components/rooms/`: Компоненти типів/класів номерів.
- `components/ui/`: Базові shadcn/Radix UI primitives.
- `docs/`: Згенерована архітектурна документація.
- `docs/architecture/`: Markdown-пояснення структури.
- `docs/structurizr/`: Structurizr DSL workspace.
- `hooks/`: Спільні React hooks.
- `lib/`: Бізнес-логіка, форматування, типи, Supabase клієнти.
- `lib/i18n/`: Українські словники і лейбли.
- `lib/reports/`: Обчислення для звітів.
- `lib/room-rack/`: Domain logic room rack.
- `lib/rooms/`: Domain logic станів і доступності номерів.
- `lib/rules/`: Бізнес-правила платежів, передплати і transitions.
- `lib/supabase/`: Supabase клієнти для server/client/proxy контекстів.
- `public/`: Публічні статичні файли.
- `scripts/`: SQL-скрипти та допоміжні maintenance-файли.
- `scripts/legacy/`: Legacy SQL repair/backfill scripts.
- `styles/`: Додаткові глобальні стилі.
- `supabase/`: Supabase local project config and migrations.
- `supabase/.temp/`: Локальний кеш Supabase CLI; середовище-залежний.
- `supabase/migrations/`: Версійні Supabase migrations.
- `tests/`: Vitest тести і тестова документація.
- `tests/support/`: Fixtures/helpers для тестів.

## Files

- `.qodo/.DS_Store`: macOS Finder metadata; не частина application logic.
- `app/dashboard/admin/activity/activity-filters.tsx`: React component: app/dashboard/admin/activity/activity-filters.tsx. (internal imports: `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/select.tsx`; external imports: `react`, `next/navigation`, `lucide-react`)
- `app/dashboard/admin/activity/page.tsx`: Next.js page route для app/dashboard/admin/activity. (internal imports: `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/table.tsx`, `lib/supabase/server.ts`, `lib/localization.ts`, `lib/audit-log.ts`, `app/dashboard/admin/activity/activity-filters.tsx`; external imports: `next/link`, `next/navigation`, `lucide-react`)
- `app/dashboard/admin/settings/actions.ts`: Server actions для цієї dashboard-гілки. (internal imports: `lib/supabase/server.ts`; external imports: `next/cache`, `@supabase/supabase-js`)
- `app/dashboard/admin/settings/page.tsx`: Next.js page route для app/dashboard/admin/settings. (internal imports: `components/admin/settings/admin-settings-client.tsx`, `lib/hotel-settings.ts`, `lib/supabase/server.ts`; external imports: `next/navigation`)
- `app/dashboard/admin/users/[id]/page.tsx`: Next.js page route для app/dashboard/admin/users/[id]. (internal imports: `components/admin/edit-user-form.tsx`, `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx`, `lib/supabase/server.ts`, `lib/localization.ts`, `lib/types.ts`; external imports: `next/link`, `next/navigation`, `lucide-react`)
- `app/dashboard/admin/users/new/page.tsx`: Next.js page route для app/dashboard/admin/users/new. (internal imports: `components/ui/card.tsx`, `components/admin/new-user-form.tsx`)
- `app/dashboard/admin/users/actions.ts`: Server actions для цієї dashboard-гілки. (internal imports: `lib/supabase/server.ts`, `lib/types.ts`, `lib/validation.ts`; external imports: `next/cache`, `next/headers`, `@supabase/supabase-js`)
- `app/dashboard/admin/users/loading.tsx`: Loading UI для маршруту.
- `app/dashboard/admin/users/page.tsx`: Next.js page route для app/dashboard/admin/users. (internal imports: `lib/supabase/server.ts`, `components/ui/card.tsx`, `components/ui/button.tsx`, `components/admin/users-table.tsx`, `lib/types.ts`; external imports: `lucide-react`, `next/link`)
- `app/dashboard/admin/.DS_Store`: macOS Finder metadata; не частина application logic.
- `app/dashboard/admin/page.tsx`: Next.js page route для app/dashboard/admin. (internal imports: `components/ui/card.tsx`, `lib/supabase/server.ts`; external imports: `next/link`, `next/navigation`, `lucide-react`)
- `app/dashboard/finance/page.tsx`: Next.js page route для app/dashboard/finance. (internal imports: `lib/supabase/server.ts`, `components/ui/card.tsx`, `components/ui/tabs.tsx`, `components/finance/payments-table.tsx`, `components/finance/folios-table.tsx`, `lib/localization.ts`, `lib/rules/payments.ts`; external imports: `next/navigation`, `lucide-react`)
- `app/dashboard/front-desk/check-in/[id]/page.tsx`: Server page маршруту check-in: перевіряє user, читає reservation/settings/profile/rooms з Supabase, рахує доступні номери і рендерить CheckInForm. (internal imports: `components/front-desk/check-in-form.tsx`, `lib/rooms/availability.ts`, `lib/hotel-settings.ts`, `lib/supabase/server.ts`, `components/reservations/reservation-actions.tsx`, `lib/types.ts`; external imports: `next/navigation`)
- `app/dashboard/front-desk/check-out/[id]/page.tsx`: Next.js page route для app/dashboard/front-desk/check-out/[id]. (internal imports: `components/front-desk/check-out-form.tsx`, `lib/hotel-settings.ts`, `lib/supabase/server.ts`; external imports: `next/navigation`)
- `app/dashboard/front-desk/.DS_Store`: macOS Finder metadata; не частина application logic.
- `app/dashboard/front-desk/page.tsx`: Next.js page route для app/dashboard/front-desk. (internal imports: `lib/supabase/server.ts`, `components/ui/tabs.tsx`, `components/front-desk/arrivals-tab.tsx`, `components/front-desk/departures-tab.tsx`, `components/front-desk/in-house-tab.tsx`; external imports: `next/navigation`)
- `app/dashboard/guests/[id]/page.tsx`: Next.js page route для app/dashboard/guests/[id]. (internal imports: `lib/supabase/server.ts`, `components/guests/guests-client.tsx`; external imports: `next/navigation`)
- `app/dashboard/guests/page.tsx`: Next.js page route для app/dashboard/guests. (internal imports: `lib/supabase/server.ts`, `components/guests/guests-client.tsx`; external imports: `next/navigation`)
- `app/dashboard/housekeeping/page.tsx`: Next.js page route для app/dashboard/housekeeping. (internal imports: `lib/supabase/server.ts`, `components/housekeeping/housekeeping-client.tsx`; external imports: `next/navigation`)
- `app/dashboard/maintenance/page.tsx`: Next.js page route для app/dashboard/maintenance. (internal imports: `lib/supabase/server.ts`, `components/maintenance/maintenance-client.tsx`; external imports: `next/navigation`)
- `app/dashboard/profile/page.tsx`: Next.js page route для app/dashboard/profile. (internal imports: `components/profile/profile-settings.tsx`, `lib/supabase/server.ts`; external imports: `next/navigation`)
- `app/dashboard/reports/page.tsx`: Next.js page route для app/dashboard/reports. (internal imports: `lib/supabase/server.ts`, `components/reports/reports-client.tsx`; external imports: `next/navigation`)
- `app/dashboard/reservations/[id]/edit/page.tsx`: Next.js page route для app/dashboard/reservations/[id]/edit. (internal imports: `lib/supabase/server.ts`, `components/ui/button.tsx`, `components/reservations/edit-reservation-form.tsx`; external imports: `next/navigation`, `next/link`, `lucide-react`)
- `app/dashboard/reservations/[id]/page.tsx`: Next.js page route для app/dashboard/reservations/[id]. (internal imports: `lib/supabase/server.ts`, `components/ui/card.tsx`, `components/ui/badge.tsx`, `lib/format.ts`, `lib/hotel-settings.ts`, `lib/rules/payments.ts`, `lib/i18n/uk.ts`, `components/reservations/reservation-actions.tsx`, `components/reservations/reservation-status-timeline.tsx`, `components/reservations/room-move-note.tsx`, `components/reservations/folio-actions.tsx`, `lib/types.ts`; external imports: `next/navigation`, `lucide-react`)
- `app/dashboard/reservations/new/page.tsx`: Next.js page route для app/dashboard/reservations/new. (internal imports: `lib/supabase/server.ts`, `components/reservations/new-reservation-form.tsx`, `components/ui/card.tsx`, `lib/hotel-settings.ts`)
- `app/dashboard/reservations/page.tsx`: Next.js page route для app/dashboard/reservations. (internal imports: `lib/supabase/server.ts`, `components/ui/card.tsx`, `components/ui/button.tsx`, `components/reservations/reservations-table.tsx`, `components/stat-card.tsx`, `lib/format.ts`, `lib/hotel-settings.ts`; external imports: `lucide-react`, `next/link`)
- `app/dashboard/room-rack/loading.tsx`: Loading UI для маршруту.
- `app/dashboard/room-rack/page.tsx`: Next.js page route для app/dashboard/room-rack. (internal imports: `lib/supabase/server.ts`, `components/room-rack/room-rack-client.tsx`, `lib/room-rack/types.ts`)
- `app/dashboard/rooms/page.tsx`: Next.js page route для app/dashboard/rooms. (internal imports: `lib/supabase/server.ts`, `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/badge.tsx`, `lib/localization.ts`, `components/dashboards/dashboard-primitives.tsx`, `components/rooms/room-class-filter.tsx`, `components/rooms/room-type-cards.tsx`, `lib/rooms/availability.ts`, `lib/types.ts`, `lib/utils.ts`; external imports: `next/navigation`, `next/link`)
- `app/dashboard/.DS_Store`: macOS Finder metadata; не частина application logic.
- `app/dashboard/layout.tsx`: Layout для вкладених маршрутів цієї гілки. (internal imports: `lib/supabase/server.ts`, `components/dashboard-nav.tsx`, `components/dashboard-header.tsx`, `components/ui/sidebar.tsx`; external imports: `react`, `next/headers`, `next/navigation`)
- `app/dashboard/page.tsx`: Next.js page route для app/dashboard. (internal imports: `lib/supabase/server.ts`, `components/dashboards/front-desk-dashboard.tsx`, `components/dashboards/admin-dashboard.tsx`, `components/dashboards/housekeeping-dashboard.tsx`, `components/dashboards/manager-dashboard.tsx`, `components/dashboards/maintenance-dashboard.tsx`; external imports: `next/navigation`, `@/components/dashboards/accountant-dashboard`)
- `app/login/page.tsx`: Next.js page route для app/login. (internal imports: `lib/supabase/client.ts`, `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `lib/validation.ts`; external imports: `react`, `next/navigation`, `lucide-react`)
- `app/.DS_Store`: macOS Finder metadata; не частина application logic.
- `app/globals.css`: Глобальні Tailwind/CSS стилі для App Router.
- `app/layout.tsx`: Root layout: глобальна HTML-обгортка застосунку. (internal imports: `components/ui/sonner.tsx`, `app/globals.css`; external imports: `react`, `next`, `next/font/google`, `@vercel/analytics/next`)
- `app/page.tsx`: Root route: стартова логіка переходу/доступу. (internal imports: `lib/supabase/server.ts`; external imports: `next/navigation`)
- `backups/aura_stay_full_20260608_234312.sql`: Local database backup SQL dump.
- `components/admin/settings/admin-settings-client.tsx`: Admin component для користувачів або налаштувань. (internal imports: `app/dashboard/admin/settings/actions.ts`, `components/ui/alert.tsx`, `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/checkbox.tsx`, `components/ui/dialog.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/select.tsx`, `components/ui/table.tsx`, `components/ui/tabs.tsx`, `components/ui/textarea.tsx`, `components/ui/accordion.tsx`, `lib/localization.ts`, `lib/format.ts`; external imports: `react`, `lucide-react`)
- `components/admin/edit-user-form.tsx`: Admin component для користувачів або налаштувань. (internal imports: `app/dashboard/admin/users/actions.ts`, `components/ui/alert.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/select.tsx`, `components/ui/switch.tsx`, `lib/types.ts`, `lib/localization.ts`, `lib/validation.ts`; external imports: `react`, `next/navigation`, `lucide-react`)
- `components/admin/new-user-form.tsx`: Admin component для користувачів або налаштувань. (internal imports: `app/dashboard/admin/users/actions.ts`, `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/select.tsx`, `components/ui/switch.tsx`, `lib/validation.ts`; external imports: `react`, `next/navigation`, `lucide-react`)
- `components/admin/users-table.tsx`: Admin component для користувачів або налаштувань. (internal imports: `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/select.tsx`, `components/ui/table.tsx`, `lib/localization.ts`, `lib/types.ts`; external imports: `react`, `next/link`, `lucide-react`)
- `components/dashboards/admin-dashboard.tsx`: Dashboard component/primitives for role-specific dashboard pages. (internal imports: `components/ui/card.tsx`, `components/ui/button.tsx`, `lib/supabase/server.ts`, `lib/types.ts`, `components/dashboards/dashboard-primitives.tsx`; external imports: `lucide-react`, `next/link`)
- `components/dashboards/dashboard-primitives.tsx`: Dashboard component/primitives for role-specific dashboard pages. (internal imports: `components/ui/button.tsx`, `components/ui/card.tsx`, `lib/utils.ts`; external imports: `next/link`, `react`, `lucide-react`)
- `components/dashboards/front-desk-dashboard.tsx`: Dashboard component/primitives for role-specific dashboard pages. (internal imports: `components/ui/button.tsx`, `components/ui/card.tsx`, `components/dashboards/dashboard-primitives.tsx`, `lib/supabase/server.ts`, `lib/types.ts`; external imports: `next/link`, `lucide-react`)
- `components/dashboards/housekeeping-dashboard.tsx`: Dashboard component/primitives for role-specific dashboard pages. (internal imports: `components/ui/card.tsx`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/select.tsx`, `components/ui/dialog.tsx`, `components/ui/textarea.tsx`, `components/ui/label.tsx`, `components/ui/input.tsx`, `components/ui/progress.tsx`, `components/ui/separator.tsx`, `components/ui/tabs.tsx`, `lib/supabase/client.ts`, `lib/localization.ts`, `lib/types.ts`, `components/dashboards/dashboard-primitives.tsx`, `lib/rules/transitions.ts`; external imports: `react`, `lucide-react`, `next/link`, `swr`)
- `components/dashboards/maintenance-dashboard.tsx`: Dashboard component/primitives for role-specific dashboard pages. (internal imports: `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/checkbox.tsx`, `components/ui/dialog.tsx`, `components/ui/dropdown-menu.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/progress.tsx`, `components/ui/select.tsx`, `components/ui/separator.tsx`, `components/ui/table.tsx`, `components/ui/tabs.tsx`, `components/ui/textarea.tsx`, `lib/supabase/client.ts`, `components/dashboards/dashboard-primitives.tsx`, `lib/localization.ts`, `lib/utils.ts`, `lib/types.ts`; external imports: `react`, `next/link`, `swr`, `lucide-react`)
- `components/dashboards/manager-charts.tsx`: Dashboard component/primitives for role-specific dashboard pages. (internal imports: `components/ui/card.tsx`; external imports: `recharts`)
- `components/dashboards/manager-dashboard.tsx`: Dashboard component/primitives for role-specific dashboard pages. (internal imports: `components/ui/button.tsx`, `components/ui/card.tsx`, `lib/supabase/server.ts`, `lib/types.ts`, `lib/rules/payments.ts`, `components/dashboards/dashboard-primitives.tsx`, `components/dashboards/manager-charts.tsx`; external imports: `next/link`, `lucide-react`)
- `components/data-table/column-header-menu.tsx`: Data table helper: фільтри, логіка, типи або column menu. (internal imports: `components/ui/button.tsx`, `components/ui/checkbox.tsx`, `components/ui/collapsible.tsx`, `components/ui/input.tsx`, `components/ui/popover.tsx`, `components/ui/scroll-area.tsx`, `components/ui/separator.tsx`, `lib/utils.ts`, `components/data-table/filter-utils.ts`, `components/data-table/types.ts`; external imports: `@tanstack/react-table`, `lucide-react`, `react`)
- `components/data-table/filter-utils.ts`: Data table helper: фільтри, логіка, типи або column menu.
- `components/data-table/table-logic.ts`: Data table helper: фільтри, логіка, типи або column menu. (internal imports: `components/data-table/filter-utils.ts`, `components/data-table/types.ts`; external imports: `@tanstack/react-table`)
- `components/data-table/types.ts`: Data table helper: фільтри, логіка, типи або column menu. (external imports: `@tanstack/react-table`)
- `components/finance/folios-table.tsx`: Finance component для folios/payments UI. (internal imports: `components/data-table.tsx`, `components/ui/badge.tsx`, `components/ui/button.tsx`, `lib/localization.ts`; external imports: `react`, `@tanstack/react-table`, `next/link`)
- `components/finance/payments-table.tsx`: Таблиця платежів у фінансовому розділі. (internal imports: `components/data-table.tsx`, `components/ui/badge.tsx`, `lib/localization.ts`, `lib/i18n/uk.ts`, `lib/types.ts`; external imports: `react`, `@tanstack/react-table`)
- `components/front-desk/arrivals-tab.tsx`: Клієнтська вкладка today's arrivals: пошук, список заїздів і кнопка переходу до check-in. (internal imports: `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/input.tsx`, `components/ui/badge.tsx`, `lib/localization.ts`; external imports: `react`, `next/link`, `lucide-react`)
- `components/front-desk/check-in-form.tsx`: Client component check-in форми: валідує статус бронювання, готовність номера, передплату, ранній заїзд, записує reservation_rooms/payments/reservations і навігує назад у front desk. (internal imports: `lib/supabase/client.ts`, `lib/format.ts`, `lib/hotel-settings.ts`, `lib/rules/prepayment.ts`, `lib/rules/payments.ts`, `lib/rules/transitions.ts`, `lib/rooms/availability.ts`, `lib/localization.ts`, `lib/i18n/uk.ts`, `lib/types.ts`, `components/ui/alert.tsx`, `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/checkbox.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/radio-group.tsx`, `components/ui/select.tsx`, `components/ui/separator.tsx`, `components/ui/textarea.tsx`, `components/reservations/room-move-note.tsx`; external imports: `react`, `next/navigation`, `lucide-react`)
- `components/front-desk/check-out-form.tsx`: Front desk component для arrivals/in-house/check-in/check-out workflow. (internal imports: `lib/supabase/client.ts`, `lib/format.ts`, `lib/hotel-settings.ts`, `lib/rules/transitions.ts`, `lib/rules/payments.ts`, `lib/i18n/uk.ts`, `lib/types.ts`, `components/ui/alert.tsx`, `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/checkbox.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/select.tsx`, `components/ui/separator.tsx`, `components/reservations/room-move-note.tsx`, `components/ui/textarea.tsx`; external imports: `react`, `next/navigation`, `next/link`, `lucide-react`)
- `components/front-desk/departures-tab.tsx`: Front desk component для arrivals/in-house/check-in/check-out workflow. (internal imports: `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/input.tsx`, `components/ui/badge.tsx`, `lib/localization.ts`; external imports: `react`, `next/link`, `lucide-react`)
- `components/front-desk/in-house-tab.tsx`: Front desk component для arrivals/in-house/check-in/check-out workflow. (internal imports: `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/input.tsx`, `components/ui/badge.tsx`, `lib/localization.ts`; external imports: `react`, `next/link`, `lucide-react`)
- `components/guests/guests-client.tsx`: Guests domain client/component. (internal imports: `components/ui/card.tsx`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/textarea.tsx`, `components/ui/select.tsx`, `components/ui/dialog.tsx`, `components/ui/tabs.tsx`, `components/ui/switch.tsx`, `components/ui/separator.tsx`, `components/ui/alert.tsx`, `components/data-table.tsx`, `lib/supabase/client.ts`, `lib/types.ts`, `lib/localization.ts`, `lib/i18n/uk.ts`, `lib/validation.ts`; external imports: `react`, `@tanstack/react-table`, `lucide-react`, `swr`)
- `components/housekeeping/housekeeping-client.tsx`: Housekeeping component для задач, kanban або стану номерів. (internal imports: `components/ui/card.tsx`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/input.tsx`, `components/ui/tabs.tsx`, `components/ui/select.tsx`, `components/ui/dialog.tsx`, `components/ui/label.tsx`, `components/ui/textarea.tsx`, `lib/supabase/client.ts`, `lib/types.ts`, `components/housekeeping/housekeeping-kanban.tsx`, `lib/localization.ts`, `lib/rules/transitions.ts`; external imports: `react`, `lucide-react`, `swr`)
- `components/housekeeping/housekeeping-kanban.tsx`: Housekeeping component для задач, kanban або стану номерів. (internal imports: `components/ui/card.tsx`, `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/select.tsx`, `components/ui/dialog.tsx`, `lib/localization.ts`; external imports: `react`, `@dnd-kit/core`, `lucide-react`)
- `components/housekeeping/room-status-grid.tsx`: Housekeeping component для задач, kanban або стану номерів. (internal imports: `components/ui/card.tsx`, `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/select.tsx`, `lib/supabase/client.ts`, `lib/localization.ts`, `lib/types.ts`; external imports: `react`, `next/navigation`)
- `components/housekeeping/tasks-list.tsx`: Housekeeping component для задач, kanban або стану номерів. (internal imports: `components/ui/card.tsx`, `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/select.tsx`, `lib/supabase/client.ts`, `lib/localization.ts`, `lib/rules/transitions.ts`; external imports: `react`, `next/navigation`, `lucide-react`)
- `components/maintenance/maintenance-client.tsx`: Maintenance component для заявок/статусів техобслуговування. (internal imports: `components/ui/card.tsx`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/textarea.tsx`, `components/ui/select.tsx`, `components/ui/dialog.tsx`, `components/ui/tabs.tsx`, `components/ui/progress.tsx`, `lib/supabase/client.ts`, `lib/localization.ts`, `lib/types.ts`; external imports: `react`, `lucide-react`, `swr`)
- `components/maintenance/maintenance-list.tsx`: Maintenance component для заявок/статусів техобслуговування. (internal imports: `components/ui/card.tsx`, `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/select.tsx`, `lib/supabase/client.ts`, `lib/localization.ts`; external imports: `react`, `next/navigation`, `lucide-react`)
- `components/profile/profile-settings.tsx`: Profile settings component. (internal imports: `components/ui/alert.tsx`, `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `lib/supabase/client.ts`, `lib/localization.ts`, `lib/validation.ts`; external imports: `react`, `lucide-react`, `next/navigation`)
- `components/reports/occupancy-report.tsx`: Reports component для occupancy/revenue/reservations analytics. (internal imports: `components/ui/card.tsx`, `components/ui/badge.tsx`)
- `components/reports/reports-client.tsx`: Reports component для occupancy/revenue/reservations analytics. (internal imports: `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/calendar.tsx`, `components/ui/label.tsx`, `components/ui/popover.tsx`, `components/ui/select.tsx`, `lib/utils.ts`, `lib/localization.ts`, `lib/reports/hotel-reporting.ts`, `lib/rules/payments.ts`; external imports: `react`, `swr`, `date-fns`, `date-fns/locale`, `lucide-react`)
- `components/reports/reservations-report.tsx`: Reports component для occupancy/revenue/reservations analytics. (internal imports: `components/ui/card.tsx`, `components/ui/badge.tsx`, `lib/localization.ts`)
- `components/reports/revenue-report.tsx`: Reports component для occupancy/revenue/reservations analytics. (internal imports: `components/ui/card.tsx`)
- `components/reservations/steps/step-dates-guests.tsx`: Крок форми створення/редагування бронювання. (internal imports: `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/calendar.tsx`, `components/ui/popover.tsx`, `lib/utils.ts`, `lib/room-rack/date-utils.ts`, `components/reservations/form-context.tsx`; external imports: `react`, `date-fns`, `date-fns/locale`, `lucide-react`)
- `components/reservations/steps/step-guest-confirm.tsx`: Крок форми створення/редагування бронювання. (internal imports: `components/ui/button.tsx`, `components/ui/label.tsx`, `components/ui/textarea.tsx`, `lib/format.ts`, `components/reservations/form-context.tsx`, `components/reservations/ui/guest-lookup-input.tsx`; external imports: `react`, `date-fns`, `date-fns/locale`, `lucide-react`)
- `components/reservations/steps/step-room-rate.tsx`: Крок форми створення/редагування бронювання. (internal imports: `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/select.tsx`, `components/ui/badge.tsx`, `components/ui/radio-group.tsx`, `lib/format.ts`, `lib/utils.ts`, `lib/rooms/availability.ts`, `components/reservations/form-context.tsx`, `components/reservations/ui/pricing-summary.tsx`; external imports: `react`, `date-fns`, `date-fns/locale`, `lucide-react`)
- `components/reservations/ui/guest-lookup-input.tsx`: Допоміжний UI component для reservation forms. (internal imports: `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/badge.tsx`, `components/ui/toggle-group.tsx`, `components/reservations/form-context.tsx`; external imports: `react`, `lucide-react`)
- `components/reservations/ui/pricing-summary.tsx`: Допоміжний UI component для reservation forms. (internal imports: `lib/format.ts`, `components/reservations/form-context.tsx`; external imports: `react`)
- `components/reservations/.DS_Store`: Reservation domain component.
- `components/reservations/edit-reservation-form.tsx`: Reservation domain component. (internal imports: `lib/supabase/client.ts`, `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/textarea.tsx`, `components/ui/calendar.tsx`, `components/ui/popover.tsx`, `components/ui/card.tsx`, `components/ui/alert.tsx`, `components/ui/badge.tsx`, `lib/utils.ts`, `lib/i18n/uk.ts`, `components/reservations/room-move-note.tsx`; external imports: `react`, `next/navigation`, `lucide-react`, `date-fns`, `date-fns/locale`)
- `components/reservations/folio-actions.tsx`: Reservation domain component. (internal imports: `lib/supabase/client.ts`, `lib/format.ts`, `lib/hotel-settings.ts`, `lib/i18n/uk.ts`, `lib/types.ts`, `components/ui/alert.tsx`, `components/ui/button.tsx`, `components/ui/dialog.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/select.tsx`, `components/ui/textarea.tsx`; external imports: `react`, `next/navigation`, `lucide-react`)
- `components/reservations/form-context.tsx`: Reservation domain component. (internal imports: `lib/supabase/client.ts`, `lib/hotel-settings.ts`, `lib/rules/prepayment.ts`, `lib/room-rack/date-utils.ts`, `lib/rooms/availability.ts`, `lib/validation.ts`; external imports: `react`, `next/navigation`, `swr`, `date-fns`)
- `components/reservations/new-reservation-form.tsx`: Reservation domain component. (internal imports: `lib/utils.ts`, `components/reservations/form-context.tsx`, `components/reservations/steps/step-dates-guests.tsx`, `components/reservations/steps/step-room-rate.tsx`, `components/reservations/steps/step-guest-confirm.tsx`; external imports: `react`)
- `components/reservations/reservation-actions.tsx`: Reservation domain component. (internal imports: `lib/supabase/client.ts`, `lib/format.ts`, `lib/hotel-settings.ts`, `lib/rules/prepayment.ts`, `lib/rules/payments.ts`, `lib/rules/transitions.ts`, `lib/i18n/uk.ts`, `lib/types.ts`, `components/ui/alert.tsx`, `components/ui/button.tsx`, `components/ui/dialog.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/radio-group.tsx`, `components/ui/textarea.tsx`; external imports: `react`, `next/navigation`, `next/link`, `lucide-react`)
- `components/reservations/reservation-status-timeline.tsx`: Reservation domain component. (internal imports: `lib/utils.ts`, `lib/i18n/uk.ts`; external imports: `lucide-react`)
- `components/reservations/reservations-table.tsx`: Reservation domain component. (internal imports: `components/data-table.tsx`, `components/ui/badge.tsx`, `components/ui/button.tsx`, `lib/localization.ts`; external imports: `@tanstack/react-table`, `lucide-react`, `next/link`, `react`)
- `components/reservations/room-move-note.tsx`: Показує нотатку про перенесення гостя між номерами. (internal imports: `lib/utils.ts`; external imports: `lucide-react`)
- `components/room-rack/confirm-move-dialog.tsx`: Room rack UI component для календаря номерів, легенди, toolbar або drag/move flow. (internal imports: `components/ui/alert-dialog.tsx`, `components/ui/separator.tsx`, `components/ui/spinner.tsx`, `lib/room-rack/types.ts`, `lib/room-rack/errors.ts`, `lib/i18n/uk.ts`, `lib/room-rack/date-utils.ts`, `lib/utils.ts`; external imports: `lucide-react`)
- `components/room-rack/reservation-block.tsx`: Room rack UI component для календаря номерів, легенди, toolbar або drag/move flow. (internal imports: `lib/types.ts`, `lib/i18n/uk.ts`, `lib/room-rack/types.ts`, `lib/utils.ts`; external imports: `@dnd-kit/core`, `react`, `lucide-react`)
- `components/room-rack/reservation-details-panel.tsx`: Room rack UI component для календаря номерів, легенди, toolbar або drag/move flow. (internal imports: `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/separator.tsx`, `components/ui/scroll-area.tsx`, `lib/i18n/uk.ts`, `lib/room-rack/types.ts`, `components/room-rack/reservation-block.tsx`, `lib/utils.ts`, `lib/room-rack/date-utils.ts`, `components/reservations/room-move-note.tsx`; external imports: `lucide-react`, `next/link`)
- `components/room-rack/room-rack-client.tsx`: Room rack UI component для календаря номерів, легенди, toolbar або drag/move flow. (internal imports: `lib/supabase/client.ts`, `lib/room-rack/types.ts`, `lib/room-rack/date-utils.ts`, `lib/room-rack/availability.ts`, `lib/room-rack/filters.ts`, `lib/room-rack/kpi.ts`, `lib/room-rack/pricing.ts`, `lib/room-rack/errors.ts`, `hooks/use-media-query.ts`, `components/room-rack/room-rack-toolbar.tsx`, `components/room-rack/room-rack-legend.tsx`, `components/room-rack/room-rack-grid.tsx`, `components/room-rack/reservation-details-panel.tsx`, `components/room-rack/confirm-move-dialog.tsx`, `components/ui/sheet.tsx`; external imports: `react`, `sonner`, `next/navigation`)
- `components/room-rack/room-rack-grid.tsx`: Room rack UI component для календаря номерів, легенди, toolbar або drag/move flow. (internal imports: `lib/room-rack/types.ts`, `lib/i18n/uk.ts`, `lib/localization.ts`, `lib/utils.ts`, `components/room-rack/reservation-block.tsx`, `lib/room-rack/date-utils.ts`; external imports: `@dnd-kit/core`, `react`, `lucide-react`)
- `components/room-rack/room-rack-legend.tsx`: Room rack UI component для календаря номерів, легенди, toolbar або drag/move flow. (internal imports: `lib/i18n/uk.ts`, `components/ui/button.tsx`, `components/ui/checkbox.tsx`, `lib/utils.ts`, `lib/room-rack/filters.ts`, `components/room-rack/reservation-block.tsx`; external imports: `lucide-react`, `react`)
- `components/room-rack/room-rack-toolbar.tsx`: Room rack UI component для календаря номерів, легенди, toolbar або drag/move flow. (internal imports: `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/select.tsx`, `components/ui/toggle-group.tsx`, `lib/room-rack/types.ts`, `lib/i18n/uk.ts`, `lib/room-rack/date-utils.ts`, `lib/utils.ts`; external imports: `lucide-react`)
- `components/rooms/room-class-filter.tsx`: Rooms component для типів/класів номерів. (internal imports: `components/ui/select.tsx`; external imports: `next/navigation`)
- `components/rooms/room-type-cards.tsx`: Rooms component для типів/класів номерів. (internal imports: `components/ui/badge.tsx`, `components/ui/card.tsx`, `components/ui/dialog.tsx`, `lib/format.ts`, `lib/rooms/availability.ts`; external imports: `react`)
- `components/ui/accordion.tsx`: Базовий UI primitive accordion, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-accordion`, `lucide-react`)
- `components/ui/alert-dialog.tsx`: Базовий UI primitive alert-dialog, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`, `components/ui/button.tsx`; external imports: `react`, `@radix-ui/react-alert-dialog`)
- `components/ui/alert.tsx`: Базовий UI primitive alert, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `class-variance-authority`)
- `components/ui/aspect-ratio.tsx`: Базовий UI primitive aspect-ratio, переважно wrapper навколо Radix/shadcn API. (external imports: `@radix-ui/react-aspect-ratio`)
- `components/ui/avatar.tsx`: Базовий UI primitive avatar, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-avatar`)
- `components/ui/badge.tsx`: Базовий UI primitive badge, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-slot`, `class-variance-authority`)
- `components/ui/breadcrumb.tsx`: Базовий UI primitive breadcrumb, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-slot`, `lucide-react`)
- `components/ui/button-group.tsx`: Базовий UI primitive button-group, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`, `components/ui/separator.tsx`; external imports: `@radix-ui/react-slot`, `class-variance-authority`)
- `components/ui/button.tsx`: Базовий UI primitive button, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-slot`, `class-variance-authority`)
- `components/ui/calendar.tsx`: Базовий UI primitive calendar, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`, `components/ui/button.tsx`; external imports: `react`, `lucide-react`, `react-day-picker`, `react-day-picker/locale`)
- `components/ui/card.tsx`: Базовий UI primitive card, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`)
- `components/ui/carousel.tsx`: Базовий UI primitive carousel, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`, `components/ui/button.tsx`; external imports: `react`, `embla-carousel-react`, `lucide-react`)
- `components/ui/chart.tsx`: Базовий UI primitive chart, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `recharts`)
- `components/ui/checkbox.tsx`: Базовий UI primitive checkbox, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-checkbox`, `lucide-react`)
- `components/ui/collapsible.tsx`: Базовий UI primitive collapsible, переважно wrapper навколо Radix/shadcn API. (external imports: `@radix-ui/react-collapsible`)
- `components/ui/command.tsx`: Базовий UI primitive command, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`, `components/ui/dialog.tsx`; external imports: `react`, `cmdk`, `lucide-react`)
- `components/ui/context-menu.tsx`: Базовий UI primitive context-menu, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-context-menu`, `lucide-react`)
- `components/ui/dialog.tsx`: Базовий UI primitive dialog, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-dialog`, `lucide-react`)
- `components/ui/drawer.tsx`: Базовий UI primitive drawer, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `vaul`)
- `components/ui/dropdown-menu.tsx`: Базовий UI primitive dropdown-menu, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-dropdown-menu`, `lucide-react`)
- `components/ui/empty.tsx`: Базовий UI primitive empty, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `class-variance-authority`)
- `components/ui/field.tsx`: Базовий UI primitive field, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`, `components/ui/label.tsx`, `components/ui/separator.tsx`; external imports: `react`, `class-variance-authority`)
- `components/ui/form.tsx`: Базовий UI primitive form, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`, `components/ui/label.tsx`; external imports: `react`, `@radix-ui/react-label`, `@radix-ui/react-slot`, `react-hook-form`)
- `components/ui/hover-card.tsx`: Базовий UI primitive hover-card, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-hover-card`)
- `components/ui/input-group.tsx`: Базовий UI primitive input-group, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`, `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/textarea.tsx`; external imports: `class-variance-authority`)
- `components/ui/input-otp.tsx`: Базовий UI primitive input-otp, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `input-otp`, `lucide-react`)
- `components/ui/input.tsx`: Базовий UI primitive input, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`)
- `components/ui/item.tsx`: Базовий UI primitive item, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`, `components/ui/separator.tsx`; external imports: `react`, `@radix-ui/react-slot`, `class-variance-authority`)
- `components/ui/kbd.tsx`: Базовий UI primitive kbd, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`)
- `components/ui/label.tsx`: Базовий UI primitive label, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-label`)
- `components/ui/menubar.tsx`: Базовий UI primitive menubar, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-menubar`, `lucide-react`)
- `components/ui/navigation-menu.tsx`: Базовий UI primitive navigation-menu, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-navigation-menu`, `class-variance-authority`, `lucide-react`)
- `components/ui/pagination.tsx`: Базовий UI primitive pagination, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`, `components/ui/button.tsx`; external imports: `react`, `lucide-react`)
- `components/ui/popover.tsx`: Базовий UI primitive popover, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-popover`)
- `components/ui/progress.tsx`: Базовий UI primitive progress, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-progress`)
- `components/ui/radio-group.tsx`: Базовий UI primitive radio-group, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-radio-group`, `lucide-react`)
- `components/ui/resizable.tsx`: Базовий UI primitive resizable, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `lucide-react`, `react-resizable-panels`)
- `components/ui/scroll-area.tsx`: Базовий UI primitive scroll-area, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-scroll-area`)
- `components/ui/select.tsx`: Базовий UI primitive select, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-select`, `lucide-react`)
- `components/ui/separator.tsx`: Базовий UI primitive separator, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-separator`)
- `components/ui/sheet.tsx`: Базовий UI primitive sheet, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-dialog`, `lucide-react`)
- `components/ui/sidebar.tsx`: Базовий UI primitive sidebar, переважно wrapper навколо Radix/shadcn API. (internal imports: `hooks/use-mobile.ts`, `lib/utils.ts`, `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/separator.tsx`, `components/ui/sheet.tsx`, `components/ui/skeleton.tsx`, `components/ui/tooltip.tsx`; external imports: `react`, `@radix-ui/react-slot`, `class-variance-authority`, `lucide-react`)
- `components/ui/skeleton.tsx`: Базовий UI primitive skeleton, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`)
- `components/ui/slider.tsx`: Базовий UI primitive slider, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-slider`)
- `components/ui/sonner.tsx`: Базовий UI primitive sonner, переважно wrapper навколо Radix/shadcn API. (external imports: `next-themes`, `sonner`)
- `components/ui/spinner.tsx`: Базовий UI primitive spinner, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `lucide-react`)
- `components/ui/switch.tsx`: Базовий UI primitive switch, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-switch`)
- `components/ui/table.tsx`: Базовий UI primitive table, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`)
- `components/ui/tabs.tsx`: Базовий UI primitive tabs, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-tabs`)
- `components/ui/textarea.tsx`: Базовий textarea primitive, який використовується у формах. (internal imports: `lib/utils.ts`; external imports: `react`)
- `components/ui/toast.tsx`: Базовий UI primitive toast, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-toast`, `class-variance-authority`, `lucide-react`)
- `components/ui/toaster.tsx`: Базовий UI primitive toaster, переважно wrapper навколо Radix/shadcn API. (internal imports: `hooks/use-toast.ts`, `components/ui/toast.tsx`)
- `components/ui/toggle-group.tsx`: Базовий UI primitive toggle-group, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`, `components/ui/toggle.tsx`; external imports: `react`, `@radix-ui/react-toggle-group`, `class-variance-authority`)
- `components/ui/toggle.tsx`: Базовий UI primitive toggle, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-toggle`, `class-variance-authority`)
- `components/ui/tooltip.tsx`: Базовий UI primitive tooltip, переважно wrapper навколо Radix/shadcn API. (internal imports: `lib/utils.ts`; external imports: `react`, `@radix-ui/react-tooltip`)
- `components/ui/use-mobile.tsx`: Базовий UI primitive use-mobile, переважно wrapper навколо Radix/shadcn API. (external imports: `react`)
- `components/ui/use-toast.ts`: Базовий UI primitive use-toast, переважно wrapper навколо Radix/shadcn API. (internal imports: `components/ui/toast.tsx`; external imports: `react`)
- `components/dashboard-header.tsx`: React component: components/dashboard-header.tsx. (internal imports: `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/sidebar.tsx`, `components/ui/dropdown-menu.tsx`, `lib/supabase/client.ts`, `lib/localization.ts`; external imports: `lucide-react`, `next/navigation`, `react`)
- `components/dashboard-nav.tsx`: React component: components/dashboard-nav.tsx. (internal imports: `lib/utils.ts`, `components/ui/sidebar.tsx`; external imports: `react`, `next/link`, `next/navigation`, `lucide-react`)
- `components/data-table.tsx`: Reusable DataTable component поверх TanStack Table. (internal imports: `components/ui/table.tsx`, `components/ui/button.tsx`, `components/ui/input.tsx`, `components/data-table/column-header-menu.tsx`, `components/data-table/table-logic.ts`, `hooks/use-table-url-sync.ts`, `lib/utils.ts`; external imports: `@tanstack/react-table`, `react`, `lucide-react`)
- `components/form-field-wrapper.tsx`: React component: components/form-field-wrapper.tsx. (internal imports: `components/ui/label.tsx`, `lib/utils.ts`; external imports: `react`)
- `components/room-status-grid.tsx`: React component: components/room-status-grid.tsx. (internal imports: `components/ui/card.tsx`, `lib/rooms/availability.ts`, `lib/types.ts`, `lib/utils.ts`; external imports: `lucide-react`)
- `components/stat-card.tsx`: React component: components/stat-card.tsx. (internal imports: `components/ui/card.tsx`; external imports: `lucide-react`)
- `components/theme-provider.tsx`: React component: components/theme-provider.tsx. (external imports: `react`, `next-themes`)
- `docs/architecture/file-structure.md`: Markdown documentation: docs/architecture/file-structure.md.
- `docs/structurizr/check-in-lite.dsl`: Project file: docs/structurizr/check-in-lite.dsl.
- `docs/structurizr/workspace-full.dsl`: Project file: docs/structurizr/workspace-full.dsl.
- `docs/structurizr/workspace.dsl`: Project file: docs/structurizr/workspace.dsl.
- `hooks/table-url-state.ts`: Reusable React hook/helper для table URL state, mobile/media query або toast. (internal imports: `hooks/table-url-sync-utils.ts`)
- `hooks/table-url-sync-utils.ts`: Reusable React hook/helper для table URL state, mobile/media query або toast. (internal imports: `components/data-table/types.ts`; external imports: `@tanstack/react-table`)
- `hooks/use-media-query.ts`: Reusable React hook/helper для table URL state, mobile/media query або toast. (external imports: `react`)
- `hooks/use-mobile.ts`: Reusable React hook/helper для table URL state, mobile/media query або toast. (external imports: `react`)
- `hooks/use-table-url-sync.ts`: Reusable React hook/helper для table URL state, mobile/media query або toast. (internal imports: `hooks/table-url-sync-utils.ts`; external imports: `next/navigation`, `react`, `@tanstack/react-table`)
- `hooks/use-toast.ts`: Reusable React hook/helper для table URL state, mobile/media query або toast. (internal imports: `components/ui/toast.tsx`; external imports: `react`)
- `lib/i18n/uk.ts`: Українська локалізація enum/value labels. (internal imports: `lib/types.ts`)
- `lib/reports/hotel-reporting.ts`: Reporting calculations. (external imports: `date-fns`)
- `lib/room-rack/availability.ts`: Room rack domain logic: dates, pricing, filters, KPI, types, errors. (internal imports: `lib/room-rack/types.ts`, `lib/room-rack/date-utils.ts`)
- `lib/room-rack/date-utils.ts`: Room rack domain logic: dates, pricing, filters, KPI, types, errors. (internal imports: `lib/i18n/uk.ts`, `lib/room-rack/types.ts`)
- `lib/room-rack/errors.ts`: Room rack domain logic: dates, pricing, filters, KPI, types, errors. (internal imports: `lib/room-rack/date-utils.ts`)
- `lib/room-rack/filters.ts`: Room rack domain logic: dates, pricing, filters, KPI, types, errors. (internal imports: `lib/room-rack/types.ts`, `lib/rooms/availability.ts`)
- `lib/room-rack/kpi.ts`: Room rack domain logic: dates, pricing, filters, KPI, types, errors. (internal imports: `lib/room-rack/types.ts`)
- `lib/room-rack/pricing.ts`: Room rack domain logic: dates, pricing, filters, KPI, types, errors. (internal imports: `lib/room-rack/date-utils.ts`, `lib/room-rack/types.ts`)
- `lib/room-rack/types.ts`: Room rack domain logic: dates, pricing, filters, KPI, types, errors. (internal imports: `lib/types.ts`)
- `lib/rooms/availability.ts`: Room availability/state domain logic. (internal imports: `lib/types.ts`)
- `lib/rules/payments.ts`: Бізнес-правила HMS domain.
- `lib/rules/prepayment.ts`: Бізнес-правила HMS domain. (internal imports: `lib/types.ts`)
- `lib/rules/transitions.ts`: Бізнес-правила HMS domain. (internal imports: `lib/types.ts`)
- `lib/supabase/client.ts`: Supabase helper для відповідного runtime context. (external imports: `@supabase/ssr`)
- `lib/supabase/proxy.ts`: Supabase helper для відповідного runtime context. (external imports: `@supabase/ssr`, `next/server`)
- `lib/supabase/server.ts`: Supabase helper для відповідного runtime context. (external imports: `@supabase/ssr`, `next/headers`)
- `lib/audit-log.ts`: Shared TypeScript utility/domain module. (external imports: `lucide-react`)
- `lib/format.ts`: Shared TypeScript utility/domain module. (internal imports: `lib/hotel-settings.ts`)
- `lib/hotel-settings.ts`: Shared TypeScript utility/domain module.
- `lib/localization.ts`: Shared TypeScript utility/domain module. (internal imports: `lib/types.ts`)
- `lib/types.ts`: Shared TypeScript utility/domain module.
- `lib/utils.ts`: Shared TypeScript utility/domain module. (external imports: `clsx`, `tailwind-merge`)
- `lib/validation.ts`: Shared TypeScript utility/domain module.
- `public/placeholder-user.jpg`: Static public asset served by Next.js.
- `public/placeholder.jpg`: Static public asset served by Next.js.
- `public/placeholder.svg`: Static public asset served by Next.js.
- `scripts/legacy/20260525_adapt_finance_to_payment_folio.sql`: Legacy SQL repair/backfill script; тримати для історії міграцій.
- `scripts/legacy/20260525_add_payments_folio_id.sql`: Legacy SQL repair/backfill script; тримати для історії міграцій.
- `scripts/legacy/20260525_backfill_folios_and_charges.sql`: Legacy SQL repair/backfill script; тримати для історії міграцій.
- `scripts/legacy/20260525_create_legacy_folios_view.sql`: Legacy SQL repair/backfill script; тримати для історії міграцій.
- `scripts/legacy/20260525_fix_reservation_folio_trigger.sql`: Legacy SQL repair/backfill script; тримати для історії міграцій.
- `scripts/legacy/20260525_normalize_payment_method.sql`: Legacy SQL repair/backfill script; тримати для історії міграцій.
- `scripts/legacy/20260525_repair_legacy_folio_totals.sql`: Legacy SQL repair/backfill script; тримати для історії міграцій.
- `scripts/legacy/20260525_repair_payment_folio_links.sql`: Legacy SQL repair/backfill script; тримати для історії міграцій.
- `scripts/legacy/20260525_set_payment_folio_trigger.sql`: Legacy SQL repair/backfill script; тримати для історії міграцій.
- `scripts/legacy/20260525_validate_reservation_checkin.sql`: Legacy SQL repair/backfill script; тримати для історії міграцій.
- `scripts/legacy/202606_manual_write_off_cancelled_no_show_balances.sql`: Legacy SQL repair/backfill script; тримати для історії міграцій.
- `scripts/legacy/20260609_reconcile_business_rule_history.sql`: Legacy SQL repair/backfill script; тримати для історії міграцій.
- `scripts/000_hms_foundation_functions.sql`: SQL migration/verification/business-rule script.
- `scripts/001_create_schema.sql`: SQL migration/verification/business-rule script.
- `scripts/001-create-database-schema.sql`: SQL migration/verification/business-rule script.
- `scripts/002_enable_rls.sql`: SQL migration/verification/business-rule script.
- `scripts/002-create-rls-policies.sql`: SQL migration/verification/business-rule script.
- `scripts/003_create_triggers.sql`: SQL migration/verification/business-rule script.
- `scripts/003-seed-initial-data.sql`: SQL migration/verification/business-rule script.
- `scripts/004_seed_data.sql`: SQL migration/verification/business-rule script.
- `scripts/005_housekeeping_profile_access.sql`: SQL migration/verification/business-rule script.
- `scripts/006_housekeeping_task_rls.sql`: SQL migration/verification/business-rule script.
- `scripts/007_allow_front_desk_checkout_tasks.sql`: SQL migration/verification/business-rule script.
- `scripts/008_reservation_integrity_triggers.sql`: SQL migration/verification/business-rule script.
- `scripts/009_normalize_maintenance_priority.sql`: SQL migration/verification/business-rule script.
- `scripts/010_room_availability_guards.sql`: SQL migration/verification/business-rule script.
- `scripts/011_profile_updated_at_trigger.sql`: SQL migration/verification/business-rule script.
- `scripts/012_remove_rate_plan_advance_days.sql`: SQL migration/verification/business-rule script.
- `scripts/013_guest_archiving.sql`: SQL migration/verification/business-rule script.
- `scripts/014_auto_refund_cancel_no_show.sql`: SQL migration/verification/business-rule script.
- `scripts/015_iban_payment_verification.sql`: SQL migration/verification/business-rule script.
- `scripts/016_reservation_cancellation_audit.sql`: SQL migration/verification/business-rule script.
- `scripts/017_finance_schema.sql`: SQL migration/verification/business-rule script.
- `scripts/018_finance_backfill.sql`: SQL migration/verification/business-rule script.
- `scripts/019_finance_logic.sql`: SQL migration/verification/business-rule script.
- `scripts/020_finance_views_verification.sql`: SQL migration/verification/business-rule script.
- `scripts/021_guest_normalization_and_identity_guards.sql`: SQL migration/verification/business-rule script.
- `scripts/022_post_migration_smoke_checks.sql`: SQL migration/verification/business-rule script.
- `scripts/023_auto_confirm_paid_reservations.sql`: SQL migration/verification/business-rule script.
- `scripts/024_business_rules_rebuild.sql`: SQL migration/verification/business-rule script.
- `scripts/025_business_rules_verification.sql`: SQL migration/verification/business-rule script.
- `scripts/026_room_state_dimensions.sql`: SQL migration/verification/business-rule script.
- `scripts/027_room_state_dimensions_verification.sql`: SQL migration/verification/business-rule script.
- `scripts/028_closed_folio_finance_guards.sql`: SQL migration/verification/business-rule script.
- `scripts/029_service_room_state_consistency.sql`: SQL migration/verification/business-rule script.
- `scripts/check-structurizr-dsl.mjs`: SQL migration/verification/business-rule script. (external imports: `node:fs`, `node:path`)
- `scripts/generate-architecture-docs.mjs`: SQL migration/verification/business-rule script. (external imports: `node:fs`, `node:path`)
- `styles/globals.css`: Додатковий legacy/global stylesheet.
- `supabase/.temp/cli-latest`: Локальний Supabase CLI cache/metadata file.
- `supabase/.temp/gotrue-version`: Локальний Supabase CLI cache/metadata file.
- `supabase/.temp/linked-project.json`: Локальний Supabase CLI cache/metadata file.
- `supabase/.temp/pooler-url`: Локальний Supabase CLI cache/metadata file.
- `supabase/.temp/postgres-version`: Локальний Supabase CLI cache/metadata file.
- `supabase/.temp/project-ref`: Локальний Supabase CLI cache/metadata file.
- `supabase/.temp/rest-version`: Локальний Supabase CLI cache/metadata file.
- `supabase/.temp/storage-migration`: Локальний Supabase CLI cache/metadata file.
- `supabase/.temp/storage-version`: Локальний Supabase CLI cache/metadata file.
- `supabase/migrations/005_room_rack_and_rules.sql`: Supabase migration file.
- `supabase/migrations/202605010005_room_rack_and_rules.sql`: Supabase migration file.
- `supabase/.gitignore`: Git ignore rules.
- `supabase/config.toml`: TOML config: supabase/config.toml.
- `tests/support/create-headless-table.ts`: Test helper/fixture/model. (internal imports: `components/data-table/table-logic.ts`; external imports: `@tanstack/react-table`)
- `tests/support/reservations-table-model.ts`: Test helper/fixture/model. (internal imports: `components/data-table/table-logic.ts`, `lib/types.ts`; external imports: `@tanstack/react-table`)
- `tests/support/reservations.fixture.ts`: Test helper/fixture/model. (internal imports: `components/data-table/table-logic.ts`; external imports: `@tanstack/react-table`)
- `tests/support/room-rack.fixture.ts`: Test helper/fixture/model. (internal imports: `lib/room-rack/types.ts`)
- `tests/data-table-test-matrix.md`: Test documentation or support artifact.
- `tests/data-table.integration.test.ts`: Vitest test for the named domain/module. (internal imports: `tests/support/create-headless-table.ts`, `tests/support/reservations-table-model.ts`; external imports: `vitest`)
- `tests/data-table.logic.test.ts`: Vitest test for the named domain/module. (internal imports: `components/data-table/filter-utils.ts`, `components/data-table/table-logic.ts`, `hooks/table-url-state.ts`, `tests/support/reservations.fixture.ts`; external imports: `vitest`)
- `tests/data-table.url-state.test.ts`: Vitest test for the named domain/module. (internal imports: `hooks/table-url-state.ts`, `tests/support/reservations-table-model.ts`; external imports: `vitest`)
- `tests/hotel-reporting.test.ts`: Vitest test for the named domain/module. (internal imports: `lib/reports/hotel-reporting.ts`; external imports: `vitest`)
- `tests/LOCALIZATION_REPORT_UA.md`: Test documentation or support artifact.
- `tests/localization.test.ts`: Vitest test for the named domain/module. (internal imports: `lib/localization.ts`; external imports: `vitest`)
- `tests/payments.test.ts`: Vitest test for the named domain/module. (internal imports: `lib/rules/payments.ts`; external imports: `vitest`)
- `tests/prepayment.test.ts`: Vitest test for the named domain/module. (internal imports: `lib/rules/prepayment.ts`; external imports: `vitest`)
- `tests/reservations-page.test.ts`: Vitest test for the named domain/module. (internal imports: `app/dashboard/reservations/page.tsx`, `lib/supabase/server.ts`; external imports: `react`, `react-dom/server`, `vitest`)
- `tests/room-availability.test.ts`: Vitest test for the named domain/module. (internal imports: `lib/rooms/availability.ts`; external imports: `vitest`)
- `tests/room-rack.errors.test.ts`: Vitest test for the named domain/module. (internal imports: `lib/room-rack/errors.ts`; external imports: `vitest`)
- `tests/room-rack.filters.test.ts`: Vitest test for the named domain/module. (internal imports: `lib/room-rack/filters.ts`, `lib/rooms/availability.ts`, `tests/support/room-rack.fixture.ts`; external imports: `vitest`)
- `tests/room-rack.kpi.test.ts`: Vitest test for the named domain/module. (internal imports: `lib/room-rack/kpi.ts`, `lib/room-rack/types.ts`; external imports: `vitest`)
- `tests/room-rack.pricing.test.ts`: Vitest test for the named domain/module. (internal imports: `lib/room-rack/pricing.ts`, `lib/room-rack/types.ts`; external imports: `vitest`)
- `tests/transitions.test.ts`: Vitest test for the named domain/module. (internal imports: `lib/rules/transitions.ts`; external imports: `vitest`)
- `tests/validation.test.ts`: Vitest test for the named domain/module. (internal imports: `lib/validation.ts`; external imports: `vitest`)
- `.DS_Store`: macOS Finder metadata; не частина application logic.
- `.env.local`: Локальні змінні середовища; не документуємо значення, бо це секрети/локальні ключі.
- `.gitignore`: Git ignore rules.
- `.pnpm-lock.yaml`: pnpm lockfile present alongside npm lock; verify package manager before changing deps.
- `appendix-code-listing.md`: Markdown documentation: appendix-code-listing.md.
- `components.json`: shadcn/ui configuration.
- `next-env.d.ts`: TypeScript module: next-env.d.ts.
- `next.config.mjs`: Next.js configuration. (external imports: `path`, `url`)
- `package-lock.json`: Зафіксований dependency tree npm.
- `package.json`: Маніфест npm: скрипти, runtime dependencies і devDependencies.
- `postcss.config.mjs`: JavaScript config/module: postcss.config.mjs.
- `proxy.ts`: Next/Supabase proxy middleware entry. (internal imports: `lib/supabase/proxy.ts`; external imports: `next/server`)
- `settings.json`: JSON config/data: settings.json.
- `tsconfig.json`: TypeScript config, включно з path aliases.
- `tsconfig.tsbuildinfo`: Project file: tsconfig.tsbuildinfo.
- `vitest.config.ts`: Vitest test runner configuration. (external imports: `node:path`, `vitest/config`)

## Check-In Page Render Map

Route: `/dashboard/front-desk/check-in/{id}`

1. `app/dashboard/front-desk/check-in/[id]/page.tsx` runs on the server, checks Supabase auth, loads reservation/settings/profile data, and redirects if the user or reservation is missing.
2. If the reservation still needs a room, the page queries ready vacant rooms, removes date-overlapping blocked rooms, marks requested-type matches, and sorts rooms for display.
3. The page renders a header, optionally `ReservationActions` for expired reservations, then `CheckInForm` with `reservation`, `availableRooms`, and normalized `hotelSettings`.
4. `CheckInForm` renders two main cards: reservation/payment summary and the check-in action card.
5. The action card conditionally renders assigned-room state with `RoomMoveNote`, or a `RadioGroup` room picker; early check-in alert; payment amount and method controls; notes; blocker/error alerts; and the final submit button.
6. On submit, `handleCheckIn` re-checks room readiness, optionally adjusts early check-in dates, inserts/updates `reservation_rooms`, inserts payment if needed, verifies prepayment, updates reservation status to `checked_in`, then routes back to `/dashboard/front-desk`.

See the Structurizr view `CheckIn_Render_And_Imports` for the visual component/import map and `CheckIn_Submit_Flow` for the mutation sequence.

