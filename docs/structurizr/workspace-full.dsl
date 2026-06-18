workspace "AuraStay architecture" "File structure and check-in render/import diagrams generated from the repository." {
  model {
    user = person "Hotel staff" "Front desk/admin/manager/housekeeping users who operate AuraStay."
    supabase = softwareSystem "Supabase" "Database, auth and API backend used by the Next.js app." {
      tags "External"
    }
    lucide = softwareSystem "lucide-react" "Icon library used in buttons and alerts." {
      tags "External"
    }
    nextRuntime = softwareSystem "Next.js runtime" "App Router, server components, client components and navigation." {
      tags "External"
    }
    aura = softwareSystem "AuraStay" "Hotel management system repository." {
      codebase = container "AuraStay repository" "Complete file/folder inventory plus import relationships." "Next.js 16, React 19, TypeScript, Supabase" {
        d001 = component "./" "Корінь проекту: конфігурація, залежності, документація і головні директорії застосунку." "Folder" {
          tags "Folder"
        }
        d002 = component ".qodo/" "Локальна конфігурація Qodo/агентів; не бере участі у runtime Next.js." "Folder" {
          tags "Folder"
        }
        d003 = component ".qodo/agents/" "Налаштування агентів Qodo." "Folder" {
          tags "Folder"
        }
        d004 = component ".qodo/workflows/" "Налаштування workflow Qodo." "Folder" {
          tags "Folder"
        }
        d005 = component "app/" "Next.js App Router: маршрути, layouts, loading states і серверні сторінки." "Folder" {
          tags "Folder"
        }
        d006 = component "app/dashboard/" "Захищена dashboard-зона готельної системи." "Folder" {
          tags "Folder"
        }
        d007 = component "app/dashboard/admin/" "Адміністративні сторінки." "Folder" {
          tags "Folder"
        }
        d008 = component "app/dashboard/admin/activity/" "Журнал активності та фільтри audit log." "Folder" {
          tags "Folder"
        }
        d009 = component "app/dashboard/admin/settings/" "Налаштування готелю і server actions для них." "Folder" {
          tags "Folder"
        }
        d010 = component "app/dashboard/admin/users/" "Керування користувачами." "Folder" {
          tags "Folder"
        }
        d011 = component "app/dashboard/admin/users/[id]/" "Редагування конкретного користувача." "Folder" {
          tags "Folder"
        }
        d012 = component "app/dashboard/admin/users/new/" "Створення нового користувача." "Folder" {
          tags "Folder"
        }
        d013 = component "app/dashboard/finance/" "Фінансовий розділ." "Folder" {
          tags "Folder"
        }
        d014 = component "app/dashboard/front-desk/" "Front desk: заїзди, виїзди, гості в готелі." "Folder" {
          tags "Folder"
        }
        d015 = component "app/dashboard/front-desk/check-in/" "Маршрути check-in." "Folder" {
          tags "Folder"
        }
        d016 = component "app/dashboard/front-desk/check-in/[id]/" "Check-in конкретного бронювання." "Folder" {
          tags "Folder"
        }
        d017 = component "app/dashboard/front-desk/check-out/" "Маршрути check-out." "Folder" {
          tags "Folder"
        }
        d018 = component "app/dashboard/front-desk/check-out/[id]/" "Check-out конкретного бронювання." "Folder" {
          tags "Folder"
        }
        d019 = component "app/dashboard/guests/" "Сторінки гостей." "Folder" {
          tags "Folder"
        }
        d020 = component "app/dashboard/guests/[id]/" "Деталі конкретного гостя." "Folder" {
          tags "Folder"
        }
        d021 = component "app/dashboard/housekeeping/" "Housekeeping сторінка." "Folder" {
          tags "Folder"
        }
        d022 = component "app/dashboard/maintenance/" "Maintenance сторінка." "Folder" {
          tags "Folder"
        }
        d023 = component "app/dashboard/profile/" "Профіль користувача." "Folder" {
          tags "Folder"
        }
        d024 = component "app/dashboard/reports/" "Звіти." "Folder" {
          tags "Folder"
        }
        d025 = component "app/dashboard/reservations/" "Маршрути бронювань." "Folder" {
          tags "Folder"
        }
        d026 = component "app/dashboard/reservations/[id]/" "Деталі конкретного бронювання." "Folder" {
          tags "Folder"
        }
        d027 = component "app/dashboard/reservations/[id]/edit/" "Редагування бронювання." "Folder" {
          tags "Folder"
        }
        d028 = component "app/dashboard/reservations/new/" "Створення бронювання." "Folder" {
          tags "Folder"
        }
        d029 = component "app/dashboard/room-rack/" "Room rack календар/сітка номерів." "Folder" {
          tags "Folder"
        }
        d030 = component "app/dashboard/rooms/" "Керування номерами." "Folder" {
          tags "Folder"
        }
        d031 = component "app/login/" "Сторінка входу." "Folder" {
          tags "Folder"
        }
        d032 = component "backups/" "Локальні SQL backup-файли." "Folder" {
          tags "Folder"
        }
        d033 = component "components/" "React-компоненти, розбиті за доменами і UI-системою." "Folder" {
          tags "Folder"
        }
        d034 = component "components/admin/" "Адмінські форми, таблиці та клієнти." "Folder" {
          tags "Folder"
        }
        d035 = component "components/admin/settings/" "Клієнт налаштувань адміністратора." "Folder" {
          tags "Folder"
        }
        d036 = component "components/dashboards/" "Dashboard-віджети для ролей і спільні primitives." "Folder" {
          tags "Folder"
        }
        d037 = component "components/data-table/" "Логіка таблиць, фільтрів і меню колонок." "Folder" {
          tags "Folder"
        }
        d038 = component "components/finance/" "Фінансові таблиці." "Folder" {
          tags "Folder"
        }
        d039 = component "components/front-desk/" "Компоненти front desk workflow." "Folder" {
          tags "Folder"
        }
        d040 = component "components/guests/" "Компоненти для гостей." "Folder" {
          tags "Folder"
        }
        d041 = component "components/housekeeping/" "Компоненти прибирання і станів номерів." "Folder" {
          tags "Folder"
        }
        d042 = component "components/maintenance/" "Компоненти технічного обслуговування." "Folder" {
          tags "Folder"
        }
        d043 = component "components/profile/" "Компоненти профілю." "Folder" {
          tags "Folder"
        }
        d044 = component "components/reports/" "Компоненти звітності." "Folder" {
          tags "Folder"
        }
        d045 = component "components/reservations/" "Компоненти бронювань." "Folder" {
          tags "Folder"
        }
        d046 = component "components/reservations/steps/" "Кроки multi-step форми бронювання." "Folder" {
          tags "Folder"
        }
        d047 = component "components/reservations/ui/" "Малі UI-компоненти для бронювань." "Folder" {
          tags "Folder"
        }
        d048 = component "components/room-rack/" "Компоненти календарної сітки номерів." "Folder" {
          tags "Folder"
        }
        d049 = component "components/rooms/" "Компоненти типів/класів номерів." "Folder" {
          tags "Folder"
        }
        d050 = component "components/ui/" "Базові shadcn/Radix UI primitives." "Folder" {
          tags "Folder"
        }
        d051 = component "docs/" "Згенерована архітектурна документація." "Folder" {
          tags "Folder"
        }
        d052 = component "docs/architecture/" "Markdown-пояснення структури." "Folder" {
          tags "Folder"
        }
        d053 = component "docs/structurizr/" "Structurizr DSL workspace." "Folder" {
          tags "Folder"
        }
        d054 = component "hooks/" "Спільні React hooks." "Folder" {
          tags "Folder"
        }
        d055 = component "lib/" "Бізнес-логіка, форматування, типи, Supabase клієнти." "Folder" {
          tags "Folder"
        }
        d056 = component "lib/i18n/" "Українські словники і лейбли." "Folder" {
          tags "Folder"
        }
        d057 = component "lib/reports/" "Обчислення для звітів." "Folder" {
          tags "Folder"
        }
        d058 = component "lib/room-rack/" "Domain logic room rack." "Folder" {
          tags "Folder"
        }
        d059 = component "lib/rooms/" "Domain logic станів і доступності номерів." "Folder" {
          tags "Folder"
        }
        d060 = component "lib/rules/" "Бізнес-правила платежів, передплати і transitions." "Folder" {
          tags "Folder"
        }
        d061 = component "lib/supabase/" "Supabase клієнти для server/client/proxy контекстів." "Folder" {
          tags "Folder"
        }
        d062 = component "public/" "Публічні статичні файли." "Folder" {
          tags "Folder"
        }
        d063 = component "scripts/" "SQL-скрипти та допоміжні maintenance-файли." "Folder" {
          tags "Folder"
        }
        d064 = component "scripts/legacy/" "Legacy SQL repair/backfill scripts." "Folder" {
          tags "Folder"
        }
        d065 = component "styles/" "Додаткові глобальні стилі." "Folder" {
          tags "Folder"
        }
        d066 = component "supabase/" "Supabase local project config and migrations." "Folder" {
          tags "Folder"
        }
        d067 = component "supabase/.temp/" "Локальний кеш Supabase CLI; середовище-залежний." "Folder" {
          tags "Folder"
        }
        d068 = component "supabase/migrations/" "Версійні Supabase migrations." "Folder" {
          tags "Folder"
        }
        d069 = component "tests/" "Vitest тести і тестова документація." "Folder" {
          tags "Folder"
        }
        d070 = component "tests/support/" "Fixtures/helpers для тестів." "Folder" {
          tags "Folder"
        }
        f071 = component ".qodo/.DS_Store" "macOS Finder metadata; не частина application logic." "File" {
          tags "File"
        }
        f072 = component "app/dashboard/admin/activity/activity-filters.tsx" "React component: app/dashboard/admin/activity/activity-filters.tsx." "TSX" {
          tags "File"
        }
        f073 = component "app/dashboard/admin/activity/page.tsx" "Next.js page route для app/dashboard/admin/activity." "TSX" {
          tags "File"
        }
        f074 = component "app/dashboard/admin/settings/actions.ts" "Server actions для цієї dashboard-гілки." "TypeScript" {
          tags "File"
        }
        f075 = component "app/dashboard/admin/settings/page.tsx" "Next.js page route для app/dashboard/admin/settings." "TSX" {
          tags "File"
        }
        f076 = component "app/dashboard/admin/users/[id]/page.tsx" "Next.js page route для app/dashboard/admin/users/[id]." "TSX" {
          tags "File"
        }
        f077 = component "app/dashboard/admin/users/new/page.tsx" "Next.js page route для app/dashboard/admin/users/new." "TSX" {
          tags "File"
        }
        f078 = component "app/dashboard/admin/users/actions.ts" "Server actions для цієї dashboard-гілки." "TypeScript" {
          tags "File"
        }
        f079 = component "app/dashboard/admin/users/loading.tsx" "Loading UI для маршруту." "TSX" {
          tags "File"
        }
        f080 = component "app/dashboard/admin/users/page.tsx" "Next.js page route для app/dashboard/admin/users." "TSX" {
          tags "File"
        }
        f081 = component "app/dashboard/admin/.DS_Store" "macOS Finder metadata; не частина application logic." "File" {
          tags "File"
        }
        f082 = component "app/dashboard/admin/page.tsx" "Next.js page route для app/dashboard/admin." "TSX" {
          tags "File"
        }
        f083 = component "app/dashboard/finance/page.tsx" "Next.js page route для app/dashboard/finance." "TSX" {
          tags "File"
        }
        f084 = component "app/dashboard/front-desk/check-in/[id]/page.tsx" "Server page маршруту check-in: перевіряє user, читає reservation/settings/profile/rooms з Supabase, рахує доступні номери і рендерить CheckInForm." "TSX" {
          tags "File"
        }
        f085 = component "app/dashboard/front-desk/check-out/[id]/page.tsx" "Next.js page route для app/dashboard/front-desk/check-out/[id]." "TSX" {
          tags "File"
        }
        f086 = component "app/dashboard/front-desk/.DS_Store" "macOS Finder metadata; не частина application logic." "File" {
          tags "File"
        }
        f087 = component "app/dashboard/front-desk/page.tsx" "Next.js page route для app/dashboard/front-desk." "TSX" {
          tags "File"
        }
        f088 = component "app/dashboard/guests/[id]/page.tsx" "Next.js page route для app/dashboard/guests/[id]." "TSX" {
          tags "File"
        }
        f089 = component "app/dashboard/guests/page.tsx" "Next.js page route для app/dashboard/guests." "TSX" {
          tags "File"
        }
        f090 = component "app/dashboard/housekeeping/page.tsx" "Next.js page route для app/dashboard/housekeeping." "TSX" {
          tags "File"
        }
        f091 = component "app/dashboard/maintenance/page.tsx" "Next.js page route для app/dashboard/maintenance." "TSX" {
          tags "File"
        }
        f092 = component "app/dashboard/profile/page.tsx" "Next.js page route для app/dashboard/profile." "TSX" {
          tags "File"
        }
        f093 = component "app/dashboard/reports/page.tsx" "Next.js page route для app/dashboard/reports." "TSX" {
          tags "File"
        }
        f094 = component "app/dashboard/reservations/[id]/edit/page.tsx" "Next.js page route для app/dashboard/reservations/[id]/edit." "TSX" {
          tags "File"
        }
        f095 = component "app/dashboard/reservations/[id]/page.tsx" "Next.js page route для app/dashboard/reservations/[id]." "TSX" {
          tags "File"
        }
        f096 = component "app/dashboard/reservations/new/page.tsx" "Next.js page route для app/dashboard/reservations/new." "TSX" {
          tags "File"
        }
        f097 = component "app/dashboard/reservations/page.tsx" "Next.js page route для app/dashboard/reservations." "TSX" {
          tags "File"
        }
        f098 = component "app/dashboard/room-rack/loading.tsx" "Loading UI для маршруту." "TSX" {
          tags "File"
        }
        f099 = component "app/dashboard/room-rack/page.tsx" "Next.js page route для app/dashboard/room-rack." "TSX" {
          tags "File"
        }
        f100 = component "app/dashboard/rooms/page.tsx" "Next.js page route для app/dashboard/rooms." "TSX" {
          tags "File"
        }
        f101 = component "app/dashboard/.DS_Store" "macOS Finder metadata; не частина application logic." "File" {
          tags "File"
        }
        f102 = component "app/dashboard/layout.tsx" "Layout для вкладених маршрутів цієї гілки." "TSX" {
          tags "File"
        }
        f103 = component "app/dashboard/page.tsx" "Next.js page route для app/dashboard." "TSX" {
          tags "File"
        }
        f104 = component "app/login/page.tsx" "Next.js page route для app/login." "TSX" {
          tags "File"
        }
        f105 = component "app/.DS_Store" "macOS Finder metadata; не частина application logic." "File" {
          tags "File"
        }
        f106 = component "app/globals.css" "Глобальні Tailwind/CSS стилі для App Router." "CSS" {
          tags "File"
        }
        f107 = component "app/layout.tsx" "Root layout: глобальна HTML-обгортка застосунку." "TSX" {
          tags "File"
        }
        f108 = component "app/page.tsx" "Root route: стартова логіка переходу/доступу." "TSX" {
          tags "File"
        }
        f109 = component "backups/aura_stay_full_20260608_234312.sql" "Local database backup SQL dump." "SQL" {
          tags "File"
        }
        f110 = component "components/admin/settings/admin-settings-client.tsx" "Admin component для користувачів або налаштувань." "TSX" {
          tags "File"
        }
        f111 = component "components/admin/edit-user-form.tsx" "Admin component для користувачів або налаштувань." "TSX" {
          tags "File"
        }
        f112 = component "components/admin/new-user-form.tsx" "Admin component для користувачів або налаштувань." "TSX" {
          tags "File"
        }
        f113 = component "components/admin/users-table.tsx" "Admin component для користувачів або налаштувань." "TSX" {
          tags "File"
        }
        f114 = component "components/dashboards/admin-dashboard.tsx" "Dashboard component/primitives for role-specific dashboard pages." "TSX" {
          tags "File"
        }
        f115 = component "components/dashboards/dashboard-primitives.tsx" "Dashboard component/primitives for role-specific dashboard pages." "TSX" {
          tags "File"
        }
        f116 = component "components/dashboards/front-desk-dashboard.tsx" "Dashboard component/primitives for role-specific dashboard pages." "TSX" {
          tags "File"
        }
        f117 = component "components/dashboards/housekeeping-dashboard.tsx" "Dashboard component/primitives for role-specific dashboard pages." "TSX" {
          tags "File"
        }
        f118 = component "components/dashboards/maintenance-dashboard.tsx" "Dashboard component/primitives for role-specific dashboard pages." "TSX" {
          tags "File"
        }
        f119 = component "components/dashboards/manager-charts.tsx" "Dashboard component/primitives for role-specific dashboard pages." "TSX" {
          tags "File"
        }
        f120 = component "components/dashboards/manager-dashboard.tsx" "Dashboard component/primitives for role-specific dashboard pages." "TSX" {
          tags "File"
        }
        f121 = component "components/data-table/column-header-menu.tsx" "Data table helper: фільтри, логіка, типи або column menu." "TSX" {
          tags "File"
        }
        f122 = component "components/data-table/filter-utils.ts" "Data table helper: фільтри, логіка, типи або column menu." "TypeScript" {
          tags "File"
        }
        f123 = component "components/data-table/table-logic.ts" "Data table helper: фільтри, логіка, типи або column menu." "TypeScript" {
          tags "File"
        }
        f124 = component "components/data-table/types.ts" "Data table helper: фільтри, логіка, типи або column menu." "TypeScript" {
          tags "File"
        }
        f125 = component "components/finance/folios-table.tsx" "Finance component для folios/payments UI." "TSX" {
          tags "File"
        }
        f126 = component "components/finance/payments-table.tsx" "Таблиця платежів у фінансовому розділі." "TSX" {
          tags "File"
        }
        f127 = component "components/front-desk/arrivals-tab.tsx" "Клієнтська вкладка today's arrivals: пошук, список заїздів і кнопка переходу до check-in." "TSX" {
          tags "File"
        }
        f128 = component "components/front-desk/check-in-form.tsx" "Client component check-in форми: валідує статус бронювання, готовність номера, передплату, ранній заїзд, записує reservation_rooms/payments/reservations і навігує назад у front desk." "TSX" {
          tags "File"
        }
        f129 = component "components/front-desk/check-out-form.tsx" "Front desk component для arrivals/in-house/check-in/check-out workflow." "TSX" {
          tags "File"
        }
        f130 = component "components/front-desk/departures-tab.tsx" "Front desk component для arrivals/in-house/check-in/check-out workflow." "TSX" {
          tags "File"
        }
        f131 = component "components/front-desk/in-house-tab.tsx" "Front desk component для arrivals/in-house/check-in/check-out workflow." "TSX" {
          tags "File"
        }
        f132 = component "components/guests/guests-client.tsx" "Guests domain client/component." "TSX" {
          tags "File"
        }
        f133 = component "components/housekeeping/housekeeping-client.tsx" "Housekeeping component для задач, kanban або стану номерів." "TSX" {
          tags "File"
        }
        f134 = component "components/housekeeping/housekeeping-kanban.tsx" "Housekeeping component для задач, kanban або стану номерів." "TSX" {
          tags "File"
        }
        f135 = component "components/housekeeping/room-status-grid.tsx" "Housekeeping component для задач, kanban або стану номерів." "TSX" {
          tags "File"
        }
        f136 = component "components/housekeeping/tasks-list.tsx" "Housekeeping component для задач, kanban або стану номерів." "TSX" {
          tags "File"
        }
        f137 = component "components/maintenance/maintenance-client.tsx" "Maintenance component для заявок/статусів техобслуговування." "TSX" {
          tags "File"
        }
        f138 = component "components/maintenance/maintenance-list.tsx" "Maintenance component для заявок/статусів техобслуговування." "TSX" {
          tags "File"
        }
        f139 = component "components/profile/profile-settings.tsx" "Profile settings component." "TSX" {
          tags "File"
        }
        f140 = component "components/reports/occupancy-report.tsx" "Reports component для occupancy/revenue/reservations analytics." "TSX" {
          tags "File"
        }
        f141 = component "components/reports/reports-client.tsx" "Reports component для occupancy/revenue/reservations analytics." "TSX" {
          tags "File"
        }
        f142 = component "components/reports/reservations-report.tsx" "Reports component для occupancy/revenue/reservations analytics." "TSX" {
          tags "File"
        }
        f143 = component "components/reports/revenue-report.tsx" "Reports component для occupancy/revenue/reservations analytics." "TSX" {
          tags "File"
        }
        f144 = component "components/reservations/steps/step-dates-guests.tsx" "Крок форми створення/редагування бронювання." "TSX" {
          tags "File"
        }
        f145 = component "components/reservations/steps/step-guest-confirm.tsx" "Крок форми створення/редагування бронювання." "TSX" {
          tags "File"
        }
        f146 = component "components/reservations/steps/step-room-rate.tsx" "Крок форми створення/редагування бронювання." "TSX" {
          tags "File"
        }
        f147 = component "components/reservations/ui/guest-lookup-input.tsx" "Допоміжний UI component для reservation forms." "TSX" {
          tags "File"
        }
        f148 = component "components/reservations/ui/pricing-summary.tsx" "Допоміжний UI component для reservation forms." "TSX" {
          tags "File"
        }
        f149 = component "components/reservations/.DS_Store" "Reservation domain component." "File" {
          tags "File"
        }
        f150 = component "components/reservations/edit-reservation-form.tsx" "Reservation domain component." "TSX" {
          tags "File"
        }
        f151 = component "components/reservations/folio-actions.tsx" "Reservation domain component." "TSX" {
          tags "File"
        }
        f152 = component "components/reservations/form-context.tsx" "Reservation domain component." "TSX" {
          tags "File"
        }
        f153 = component "components/reservations/new-reservation-form.tsx" "Reservation domain component." "TSX" {
          tags "File"
        }
        f154 = component "components/reservations/reservation-actions.tsx" "Reservation domain component." "TSX" {
          tags "File"
        }
        f155 = component "components/reservations/reservation-status-timeline.tsx" "Reservation domain component." "TSX" {
          tags "File"
        }
        f156 = component "components/reservations/reservations-table.tsx" "Reservation domain component." "TSX" {
          tags "File"
        }
        f157 = component "components/reservations/room-move-note.tsx" "Показує нотатку про перенесення гостя між номерами." "TSX" {
          tags "File"
        }
        f158 = component "components/room-rack/confirm-move-dialog.tsx" "Room rack UI component для календаря номерів, легенди, toolbar або drag/move flow." "TSX" {
          tags "File"
        }
        f159 = component "components/room-rack/reservation-block.tsx" "Room rack UI component для календаря номерів, легенди, toolbar або drag/move flow." "TSX" {
          tags "File"
        }
        f160 = component "components/room-rack/reservation-details-panel.tsx" "Room rack UI component для календаря номерів, легенди, toolbar або drag/move flow." "TSX" {
          tags "File"
        }
        f161 = component "components/room-rack/room-rack-client.tsx" "Room rack UI component для календаря номерів, легенди, toolbar або drag/move flow." "TSX" {
          tags "File"
        }
        f162 = component "components/room-rack/room-rack-grid.tsx" "Room rack UI component для календаря номерів, легенди, toolbar або drag/move flow." "TSX" {
          tags "File"
        }
        f163 = component "components/room-rack/room-rack-legend.tsx" "Room rack UI component для календаря номерів, легенди, toolbar або drag/move flow." "TSX" {
          tags "File"
        }
        f164 = component "components/room-rack/room-rack-toolbar.tsx" "Room rack UI component для календаря номерів, легенди, toolbar або drag/move flow." "TSX" {
          tags "File"
        }
        f165 = component "components/rooms/room-class-filter.tsx" "Rooms component для типів/класів номерів." "TSX" {
          tags "File"
        }
        f166 = component "components/rooms/room-type-cards.tsx" "Rooms component для типів/класів номерів." "TSX" {
          tags "File"
        }
        f167 = component "components/ui/accordion.tsx" "Базовий UI primitive accordion, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f168 = component "components/ui/alert-dialog.tsx" "Базовий UI primitive alert-dialog, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f169 = component "components/ui/alert.tsx" "Базовий UI primitive alert, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f170 = component "components/ui/aspect-ratio.tsx" "Базовий UI primitive aspect-ratio, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f171 = component "components/ui/avatar.tsx" "Базовий UI primitive avatar, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f172 = component "components/ui/badge.tsx" "Базовий UI primitive badge, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f173 = component "components/ui/breadcrumb.tsx" "Базовий UI primitive breadcrumb, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f174 = component "components/ui/button-group.tsx" "Базовий UI primitive button-group, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f175 = component "components/ui/button.tsx" "Базовий UI primitive button, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f176 = component "components/ui/calendar.tsx" "Базовий UI primitive calendar, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f177 = component "components/ui/card.tsx" "Базовий UI primitive card, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f178 = component "components/ui/carousel.tsx" "Базовий UI primitive carousel, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f179 = component "components/ui/chart.tsx" "Базовий UI primitive chart, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f180 = component "components/ui/checkbox.tsx" "Базовий UI primitive checkbox, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f181 = component "components/ui/collapsible.tsx" "Базовий UI primitive collapsible, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f182 = component "components/ui/command.tsx" "Базовий UI primitive command, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f183 = component "components/ui/context-menu.tsx" "Базовий UI primitive context-menu, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f184 = component "components/ui/dialog.tsx" "Базовий UI primitive dialog, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f185 = component "components/ui/drawer.tsx" "Базовий UI primitive drawer, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f186 = component "components/ui/dropdown-menu.tsx" "Базовий UI primitive dropdown-menu, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f187 = component "components/ui/empty.tsx" "Базовий UI primitive empty, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f188 = component "components/ui/field.tsx" "Базовий UI primitive field, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f189 = component "components/ui/form.tsx" "Базовий UI primitive form, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f190 = component "components/ui/hover-card.tsx" "Базовий UI primitive hover-card, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f191 = component "components/ui/input-group.tsx" "Базовий UI primitive input-group, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f192 = component "components/ui/input-otp.tsx" "Базовий UI primitive input-otp, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f193 = component "components/ui/input.tsx" "Базовий UI primitive input, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f194 = component "components/ui/item.tsx" "Базовий UI primitive item, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f195 = component "components/ui/kbd.tsx" "Базовий UI primitive kbd, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f196 = component "components/ui/label.tsx" "Базовий UI primitive label, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f197 = component "components/ui/menubar.tsx" "Базовий UI primitive menubar, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f198 = component "components/ui/navigation-menu.tsx" "Базовий UI primitive navigation-menu, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f199 = component "components/ui/pagination.tsx" "Базовий UI primitive pagination, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f200 = component "components/ui/popover.tsx" "Базовий UI primitive popover, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f201 = component "components/ui/progress.tsx" "Базовий UI primitive progress, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f202 = component "components/ui/radio-group.tsx" "Базовий UI primitive radio-group, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f203 = component "components/ui/resizable.tsx" "Базовий UI primitive resizable, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f204 = component "components/ui/scroll-area.tsx" "Базовий UI primitive scroll-area, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f205 = component "components/ui/select.tsx" "Базовий UI primitive select, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f206 = component "components/ui/separator.tsx" "Базовий UI primitive separator, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f207 = component "components/ui/sheet.tsx" "Базовий UI primitive sheet, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f208 = component "components/ui/sidebar.tsx" "Базовий UI primitive sidebar, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f209 = component "components/ui/skeleton.tsx" "Базовий UI primitive skeleton, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f210 = component "components/ui/slider.tsx" "Базовий UI primitive slider, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f211 = component "components/ui/sonner.tsx" "Базовий UI primitive sonner, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f212 = component "components/ui/spinner.tsx" "Базовий UI primitive spinner, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f213 = component "components/ui/switch.tsx" "Базовий UI primitive switch, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f214 = component "components/ui/table.tsx" "Базовий UI primitive table, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f215 = component "components/ui/tabs.tsx" "Базовий UI primitive tabs, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f216 = component "components/ui/textarea.tsx" "Базовий textarea primitive, який використовується у формах." "TSX" {
          tags "File"
        }
        f217 = component "components/ui/toast.tsx" "Базовий UI primitive toast, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f218 = component "components/ui/toaster.tsx" "Базовий UI primitive toaster, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f219 = component "components/ui/toggle-group.tsx" "Базовий UI primitive toggle-group, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f220 = component "components/ui/toggle.tsx" "Базовий UI primitive toggle, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f221 = component "components/ui/tooltip.tsx" "Базовий UI primitive tooltip, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f222 = component "components/ui/use-mobile.tsx" "Базовий UI primitive use-mobile, переважно wrapper навколо Radix/shadcn API." "TSX" {
          tags "File"
        }
        f223 = component "components/ui/use-toast.ts" "Базовий UI primitive use-toast, переважно wrapper навколо Radix/shadcn API." "TypeScript" {
          tags "File"
        }
        f224 = component "components/dashboard-header.tsx" "React component: components/dashboard-header.tsx." "TSX" {
          tags "File"
        }
        f225 = component "components/dashboard-nav.tsx" "React component: components/dashboard-nav.tsx." "TSX" {
          tags "File"
        }
        f226 = component "components/data-table.tsx" "Reusable DataTable component поверх TanStack Table." "TSX" {
          tags "File"
        }
        f227 = component "components/form-field-wrapper.tsx" "React component: components/form-field-wrapper.tsx." "TSX" {
          tags "File"
        }
        f228 = component "components/room-status-grid.tsx" "React component: components/room-status-grid.tsx." "TSX" {
          tags "File"
        }
        f229 = component "components/stat-card.tsx" "React component: components/stat-card.tsx." "TSX" {
          tags "File"
        }
        f230 = component "components/theme-provider.tsx" "React component: components/theme-provider.tsx." "TSX" {
          tags "File"
        }
        f231 = component "docs/architecture/file-structure.md" "Markdown documentation: docs/architecture/file-structure.md." "Markdown" {
          tags "File"
        }
        f232 = component "docs/structurizr/check-in-lite.dsl" "Project file: docs/structurizr/check-in-lite.dsl." "File" {
          tags "File"
        }
        f233 = component "docs/structurizr/workspace-full.dsl" "Project file: docs/structurizr/workspace-full.dsl." "File" {
          tags "File"
        }
        f234 = component "docs/structurizr/workspace.dsl" "Project file: docs/structurizr/workspace.dsl." "File" {
          tags "File"
        }
        f235 = component "hooks/table-url-state.ts" "Reusable React hook/helper для table URL state, mobile/media query або toast." "TypeScript" {
          tags "File"
        }
        f236 = component "hooks/table-url-sync-utils.ts" "Reusable React hook/helper для table URL state, mobile/media query або toast." "TypeScript" {
          tags "File"
        }
        f237 = component "hooks/use-media-query.ts" "Reusable React hook/helper для table URL state, mobile/media query або toast." "TypeScript" {
          tags "File"
        }
        f238 = component "hooks/use-mobile.ts" "Reusable React hook/helper для table URL state, mobile/media query або toast." "TypeScript" {
          tags "File"
        }
        f239 = component "hooks/use-table-url-sync.ts" "Reusable React hook/helper для table URL state, mobile/media query або toast." "TypeScript" {
          tags "File"
        }
        f240 = component "hooks/use-toast.ts" "Reusable React hook/helper для table URL state, mobile/media query або toast." "TypeScript" {
          tags "File"
        }
        f241 = component "lib/i18n/uk.ts" "Українська локалізація enum/value labels." "TypeScript" {
          tags "File"
        }
        f242 = component "lib/reports/hotel-reporting.ts" "Reporting calculations." "TypeScript" {
          tags "File"
        }
        f243 = component "lib/room-rack/availability.ts" "Room rack domain logic: dates, pricing, filters, KPI, types, errors." "TypeScript" {
          tags "File"
        }
        f244 = component "lib/room-rack/date-utils.ts" "Room rack domain logic: dates, pricing, filters, KPI, types, errors." "TypeScript" {
          tags "File"
        }
        f245 = component "lib/room-rack/errors.ts" "Room rack domain logic: dates, pricing, filters, KPI, types, errors." "TypeScript" {
          tags "File"
        }
        f246 = component "lib/room-rack/filters.ts" "Room rack domain logic: dates, pricing, filters, KPI, types, errors." "TypeScript" {
          tags "File"
        }
        f247 = component "lib/room-rack/kpi.ts" "Room rack domain logic: dates, pricing, filters, KPI, types, errors." "TypeScript" {
          tags "File"
        }
        f248 = component "lib/room-rack/pricing.ts" "Room rack domain logic: dates, pricing, filters, KPI, types, errors." "TypeScript" {
          tags "File"
        }
        f249 = component "lib/room-rack/types.ts" "Room rack domain logic: dates, pricing, filters, KPI, types, errors." "TypeScript" {
          tags "File"
        }
        f250 = component "lib/rooms/availability.ts" "Room availability/state domain logic." "TypeScript" {
          tags "File"
        }
        f251 = component "lib/rules/payments.ts" "Бізнес-правила HMS domain." "TypeScript" {
          tags "File"
        }
        f252 = component "lib/rules/prepayment.ts" "Бізнес-правила HMS domain." "TypeScript" {
          tags "File"
        }
        f253 = component "lib/rules/transitions.ts" "Бізнес-правила HMS domain." "TypeScript" {
          tags "File"
        }
        f254 = component "lib/supabase/client.ts" "Supabase helper для відповідного runtime context." "TypeScript" {
          tags "File"
        }
        f255 = component "lib/supabase/proxy.ts" "Supabase helper для відповідного runtime context." "TypeScript" {
          tags "File"
        }
        f256 = component "lib/supabase/server.ts" "Supabase helper для відповідного runtime context." "TypeScript" {
          tags "File"
        }
        f257 = component "lib/audit-log.ts" "Shared TypeScript utility/domain module." "TypeScript" {
          tags "File"
        }
        f258 = component "lib/format.ts" "Shared TypeScript utility/domain module." "TypeScript" {
          tags "File"
        }
        f259 = component "lib/hotel-settings.ts" "Shared TypeScript utility/domain module." "TypeScript" {
          tags "File"
        }
        f260 = component "lib/localization.ts" "Shared TypeScript utility/domain module." "TypeScript" {
          tags "File"
        }
        f261 = component "lib/types.ts" "Shared TypeScript utility/domain module." "TypeScript" {
          tags "File"
        }
        f262 = component "lib/utils.ts" "Shared TypeScript utility/domain module." "TypeScript" {
          tags "File"
        }
        f263 = component "lib/validation.ts" "Shared TypeScript utility/domain module." "TypeScript" {
          tags "File"
        }
        f264 = component "public/placeholder-user.jpg" "Static public asset served by Next.js." "Static asset" {
          tags "File"
        }
        f265 = component "public/placeholder.jpg" "Static public asset served by Next.js." "Static asset" {
          tags "File"
        }
        f266 = component "public/placeholder.svg" "Static public asset served by Next.js." "Static asset" {
          tags "File"
        }
        f267 = component "scripts/legacy/20260525_adapt_finance_to_payment_folio.sql" "Legacy SQL repair/backfill script; тримати для історії міграцій." "SQL" {
          tags "File"
        }
        f268 = component "scripts/legacy/20260525_add_payments_folio_id.sql" "Legacy SQL repair/backfill script; тримати для історії міграцій." "SQL" {
          tags "File"
        }
        f269 = component "scripts/legacy/20260525_backfill_folios_and_charges.sql" "Legacy SQL repair/backfill script; тримати для історії міграцій." "SQL" {
          tags "File"
        }
        f270 = component "scripts/legacy/20260525_create_legacy_folios_view.sql" "Legacy SQL repair/backfill script; тримати для історії міграцій." "SQL" {
          tags "File"
        }
        f271 = component "scripts/legacy/20260525_fix_reservation_folio_trigger.sql" "Legacy SQL repair/backfill script; тримати для історії міграцій." "SQL" {
          tags "File"
        }
        f272 = component "scripts/legacy/20260525_normalize_payment_method.sql" "Legacy SQL repair/backfill script; тримати для історії міграцій." "SQL" {
          tags "File"
        }
        f273 = component "scripts/legacy/20260525_repair_legacy_folio_totals.sql" "Legacy SQL repair/backfill script; тримати для історії міграцій." "SQL" {
          tags "File"
        }
        f274 = component "scripts/legacy/20260525_repair_payment_folio_links.sql" "Legacy SQL repair/backfill script; тримати для історії міграцій." "SQL" {
          tags "File"
        }
        f275 = component "scripts/legacy/20260525_set_payment_folio_trigger.sql" "Legacy SQL repair/backfill script; тримати для історії міграцій." "SQL" {
          tags "File"
        }
        f276 = component "scripts/legacy/20260525_validate_reservation_checkin.sql" "Legacy SQL repair/backfill script; тримати для історії міграцій." "SQL" {
          tags "File"
        }
        f277 = component "scripts/legacy/202606_manual_write_off_cancelled_no_show_balances.sql" "Legacy SQL repair/backfill script; тримати для історії міграцій." "SQL" {
          tags "File"
        }
        f278 = component "scripts/legacy/20260609_reconcile_business_rule_history.sql" "Legacy SQL repair/backfill script; тримати для історії міграцій." "SQL" {
          tags "File"
        }
        f279 = component "scripts/000_hms_foundation_functions.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f280 = component "scripts/001_create_schema.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f281 = component "scripts/001-create-database-schema.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f282 = component "scripts/002_enable_rls.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f283 = component "scripts/002-create-rls-policies.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f284 = component "scripts/003_create_triggers.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f285 = component "scripts/003-seed-initial-data.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f286 = component "scripts/004_seed_data.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f287 = component "scripts/005_housekeeping_profile_access.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f288 = component "scripts/006_housekeeping_task_rls.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f289 = component "scripts/007_allow_front_desk_checkout_tasks.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f290 = component "scripts/008_reservation_integrity_triggers.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f291 = component "scripts/009_normalize_maintenance_priority.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f292 = component "scripts/010_room_availability_guards.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f293 = component "scripts/011_profile_updated_at_trigger.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f294 = component "scripts/012_remove_rate_plan_advance_days.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f295 = component "scripts/013_guest_archiving.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f296 = component "scripts/014_auto_refund_cancel_no_show.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f297 = component "scripts/015_iban_payment_verification.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f298 = component "scripts/016_reservation_cancellation_audit.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f299 = component "scripts/017_finance_schema.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f300 = component "scripts/018_finance_backfill.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f301 = component "scripts/019_finance_logic.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f302 = component "scripts/020_finance_views_verification.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f303 = component "scripts/021_guest_normalization_and_identity_guards.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f304 = component "scripts/022_post_migration_smoke_checks.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f305 = component "scripts/023_auto_confirm_paid_reservations.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f306 = component "scripts/024_business_rules_rebuild.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f307 = component "scripts/025_business_rules_verification.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f308 = component "scripts/026_room_state_dimensions.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f309 = component "scripts/027_room_state_dimensions_verification.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f310 = component "scripts/028_closed_folio_finance_guards.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f311 = component "scripts/029_service_room_state_consistency.sql" "SQL migration/verification/business-rule script." "SQL" {
          tags "File"
        }
        f312 = component "scripts/check-structurizr-dsl.mjs" "SQL migration/verification/business-rule script." "MJS" {
          tags "File"
        }
        f313 = component "scripts/generate-architecture-docs.mjs" "SQL migration/verification/business-rule script." "MJS" {
          tags "File"
        }
        f314 = component "styles/globals.css" "Додатковий legacy/global stylesheet." "CSS" {
          tags "File"
        }
        f315 = component "supabase/.temp/cli-latest" "Локальний Supabase CLI cache/metadata file." "File" {
          tags "File"
        }
        f316 = component "supabase/.temp/gotrue-version" "Локальний Supabase CLI cache/metadata file." "File" {
          tags "File"
        }
        f317 = component "supabase/.temp/linked-project.json" "Локальний Supabase CLI cache/metadata file." "JSON" {
          tags "File"
        }
        f318 = component "supabase/.temp/pooler-url" "Локальний Supabase CLI cache/metadata file." "File" {
          tags "File"
        }
        f319 = component "supabase/.temp/postgres-version" "Локальний Supabase CLI cache/metadata file." "File" {
          tags "File"
        }
        f320 = component "supabase/.temp/project-ref" "Локальний Supabase CLI cache/metadata file." "File" {
          tags "File"
        }
        f321 = component "supabase/.temp/rest-version" "Локальний Supabase CLI cache/metadata file." "File" {
          tags "File"
        }
        f322 = component "supabase/.temp/storage-migration" "Локальний Supabase CLI cache/metadata file." "File" {
          tags "File"
        }
        f323 = component "supabase/.temp/storage-version" "Локальний Supabase CLI cache/metadata file." "File" {
          tags "File"
        }
        f324 = component "supabase/migrations/005_room_rack_and_rules.sql" "Supabase migration file." "SQL" {
          tags "File"
        }
        f325 = component "supabase/migrations/202605010005_room_rack_and_rules.sql" "Supabase migration file." "SQL" {
          tags "File"
        }
        f326 = component "supabase/.gitignore" "Git ignore rules." "File" {
          tags "File"
        }
        f327 = component "supabase/config.toml" "TOML config: supabase/config.toml." "TOML" {
          tags "File"
        }
        f328 = component "tests/support/create-headless-table.ts" "Test helper/fixture/model." "TypeScript" {
          tags "File"
        }
        f329 = component "tests/support/reservations-table-model.ts" "Test helper/fixture/model." "TypeScript" {
          tags "File"
        }
        f330 = component "tests/support/reservations.fixture.ts" "Test helper/fixture/model." "TypeScript" {
          tags "File"
        }
        f331 = component "tests/support/room-rack.fixture.ts" "Test helper/fixture/model." "TypeScript" {
          tags "File"
        }
        f332 = component "tests/data-table-test-matrix.md" "Test documentation or support artifact." "Markdown" {
          tags "File"
        }
        f333 = component "tests/data-table.integration.test.ts" "Vitest test for the named domain/module." "TypeScript" {
          tags "File"
        }
        f334 = component "tests/data-table.logic.test.ts" "Vitest test for the named domain/module." "TypeScript" {
          tags "File"
        }
        f335 = component "tests/data-table.url-state.test.ts" "Vitest test for the named domain/module." "TypeScript" {
          tags "File"
        }
        f336 = component "tests/hotel-reporting.test.ts" "Vitest test for the named domain/module." "TypeScript" {
          tags "File"
        }
        f337 = component "tests/LOCALIZATION_REPORT_UA.md" "Test documentation or support artifact." "Markdown" {
          tags "File"
        }
        f338 = component "tests/localization.test.ts" "Vitest test for the named domain/module." "TypeScript" {
          tags "File"
        }
        f339 = component "tests/payments.test.ts" "Vitest test for the named domain/module." "TypeScript" {
          tags "File"
        }
        f340 = component "tests/prepayment.test.ts" "Vitest test for the named domain/module." "TypeScript" {
          tags "File"
        }
        f341 = component "tests/reservations-page.test.ts" "Vitest test for the named domain/module." "TypeScript" {
          tags "File"
        }
        f342 = component "tests/room-availability.test.ts" "Vitest test for the named domain/module." "TypeScript" {
          tags "File"
        }
        f343 = component "tests/room-rack.errors.test.ts" "Vitest test for the named domain/module." "TypeScript" {
          tags "File"
        }
        f344 = component "tests/room-rack.filters.test.ts" "Vitest test for the named domain/module." "TypeScript" {
          tags "File"
        }
        f345 = component "tests/room-rack.kpi.test.ts" "Vitest test for the named domain/module." "TypeScript" {
          tags "File"
        }
        f346 = component "tests/room-rack.pricing.test.ts" "Vitest test for the named domain/module." "TypeScript" {
          tags "File"
        }
        f347 = component "tests/transitions.test.ts" "Vitest test for the named domain/module." "TypeScript" {
          tags "File"
        }
        f348 = component "tests/validation.test.ts" "Vitest test for the named domain/module." "TypeScript" {
          tags "File"
        }
        f349 = component ".DS_Store" "macOS Finder metadata; не частина application logic." "File" {
          tags "File"
        }
        f350 = component ".env.local" "Локальні змінні середовища; не документуємо значення, бо це секрети/локальні ключі." "Environment" {
          tags "File"
        }
        f351 = component ".gitignore" "Git ignore rules." "File" {
          tags "File"
        }
        f352 = component ".pnpm-lock.yaml" "pnpm lockfile present alongside npm lock; verify package manager before changing deps." "File" {
          tags "File"
        }
        f353 = component "appendix-code-listing.md" "Markdown documentation: appendix-code-listing.md." "Markdown" {
          tags "File"
        }
        f354 = component "components.json" "shadcn/ui configuration." "JSON" {
          tags "File"
        }
        f355 = component "next-env.d.ts" "TypeScript module: next-env.d.ts." "TypeScript" {
          tags "File"
        }
        f356 = component "next.config.mjs" "Next.js configuration." "MJS" {
          tags "File"
        }
        f357 = component "package-lock.json" "Зафіксований dependency tree npm." "JSON" {
          tags "File"
        }
        f358 = component "package.json" "Маніфест npm: скрипти, runtime dependencies і devDependencies." "JSON" {
          tags "File"
        }
        f359 = component "postcss.config.mjs" "JavaScript config/module: postcss.config.mjs." "MJS" {
          tags "File"
        }
        f360 = component "proxy.ts" "Next/Supabase proxy middleware entry." "TypeScript" {
          tags "File"
        }
        f361 = component "settings.json" "JSON config/data: settings.json." "JSON" {
          tags "File"
        }
        f362 = component "tsconfig.json" "TypeScript config, включно з path aliases." "JSON" {
          tags "File"
        }
        f363 = component "tsconfig.tsbuildinfo" "Project file: tsconfig.tsbuildinfo." "File" {
          tags "File"
        }
        f364 = component "vitest.config.ts" "Vitest test runner configuration." "TypeScript" {
          tags "File"
        }
        rbHeader = component "Header: Check-in gostia" "Заголовок маршруту, пояснює оператору front desk що треба перевірити перед заселенням." "Render block" {
          tags "RenderBlock"
        }
        rbExpiredActions = component "Expired reservation actions" "Умовний блок ReservationActions, якщо дата виїзду вже минула." "Render block" {
          tags "RenderBlock"
        }
        rbDetails = component "Card: Detali broniuvannia" "Ліва колонка CheckInForm: номер броні, гість, дати, ночі, гості, суми, передплата, прогрес оплати." "Render block" {
          tags "RenderBlock"
        }
        rbCheckIn = component "Card: Zaselennia" "Права колонка CheckInForm: вибір/стан номера, early check-in, оплата, спосіб оплати, примітки, помилки і submit." "Render block" {
          tags "RenderBlock"
        }
        rbAssignedRoom = component "Assigned room state" "Показує призначений номер, room status badge і RoomMoveNote." "Render block" {
          tags "RenderBlock"
        }
        rbRoomPicker = component "Available rooms picker" "RadioGroup зі списком доступних кімнат, бейджами готовності і типу номера." "Render block" {
          tags "RenderBlock"
        }
        rbEarly = component "Early check-in guard" "Alert + Checkbox + Textarea для раннього заїзду." "Render block" {
          tags "RenderBlock"
        }
        rbPayment = component "Payment input block" "Input суми, quick buttons, Select payment method і prepayment validation." "Render block" {
          tags "RenderBlock"
        }
        rbNotes = component "Notes block" "Textarea для приміток check-in." "Render block" {
          tags "RenderBlock"
        }
        rbBlockers = component "Blocking/error alerts" "Alert-и для transition, room readiness, overpay, missing prepayment або runtime error." "Render block" {
          tags "RenderBlock"
        }
        rbSubmit = component "Submit button" "Button з Loader2/CheckCircle, викликає handleCheckIn і disabled через canSubmit." "Render block" {
          tags "RenderBlock"
        }
        rbSupabaseRead = component "Server Supabase reads" "reservation, hotel_settings, profile, available rooms, overlapping reservation_rooms." "Render block" {
          tags "RenderBlock"
        }
        rbSupabaseWrite = component "Client Supabase writes" "rooms re-check, reservation_rooms insert/update, payments insert, reservations status update." "Render block" {
          tags "RenderBlock"
        }
        rbRouter = component "Next router navigation" "router.push('/dashboard/front-desk') і router.refresh після успішного check-in." "Render block" {
          tags "RenderBlock"
        }
      }
    }
    user -> aura "uses"
    aura -> supabase "reads/writes hotel data"
    d001 -> d002 "contains"
    d002 -> d003 "contains"
    d002 -> d004 "contains"
    d001 -> d005 "contains"
    d005 -> d006 "contains"
    d006 -> d007 "contains"
    d007 -> d008 "contains"
    d007 -> d009 "contains"
    d007 -> d010 "contains"
    d010 -> d011 "contains"
    d010 -> d012 "contains"
    d006 -> d013 "contains"
    d006 -> d014 "contains"
    d014 -> d015 "contains"
    d015 -> d016 "contains"
    d014 -> d017 "contains"
    d017 -> d018 "contains"
    d006 -> d019 "contains"
    d019 -> d020 "contains"
    d006 -> d021 "contains"
    d006 -> d022 "contains"
    d006 -> d023 "contains"
    d006 -> d024 "contains"
    d006 -> d025 "contains"
    d025 -> d026 "contains"
    d026 -> d027 "contains"
    d025 -> d028 "contains"
    d006 -> d029 "contains"
    d006 -> d030 "contains"
    d005 -> d031 "contains"
    d001 -> d032 "contains"
    d001 -> d033 "contains"
    d033 -> d034 "contains"
    d034 -> d035 "contains"
    d033 -> d036 "contains"
    d033 -> d037 "contains"
    d033 -> d038 "contains"
    d033 -> d039 "contains"
    d033 -> d040 "contains"
    d033 -> d041 "contains"
    d033 -> d042 "contains"
    d033 -> d043 "contains"
    d033 -> d044 "contains"
    d033 -> d045 "contains"
    d045 -> d046 "contains"
    d045 -> d047 "contains"
    d033 -> d048 "contains"
    d033 -> d049 "contains"
    d033 -> d050 "contains"
    d001 -> d051 "contains"
    d051 -> d052 "contains"
    d051 -> d053 "contains"
    d001 -> d054 "contains"
    d001 -> d055 "contains"
    d055 -> d056 "contains"
    d055 -> d057 "contains"
    d055 -> d058 "contains"
    d055 -> d059 "contains"
    d055 -> d060 "contains"
    d055 -> d061 "contains"
    d001 -> d062 "contains"
    d001 -> d063 "contains"
    d063 -> d064 "contains"
    d001 -> d065 "contains"
    d001 -> d066 "contains"
    d066 -> d067 "contains"
    d066 -> d068 "contains"
    d001 -> d069 "contains"
    d069 -> d070 "contains"
    d002 -> f071 "contains"
    d008 -> f072 "contains"
    d008 -> f073 "contains"
    d009 -> f074 "contains"
    d009 -> f075 "contains"
    d011 -> f076 "contains"
    d012 -> f077 "contains"
    d010 -> f078 "contains"
    d010 -> f079 "contains"
    d010 -> f080 "contains"
    d007 -> f081 "contains"
    d007 -> f082 "contains"
    d013 -> f083 "contains"
    d016 -> f084 "contains"
    d018 -> f085 "contains"
    d014 -> f086 "contains"
    d014 -> f087 "contains"
    d020 -> f088 "contains"
    d019 -> f089 "contains"
    d021 -> f090 "contains"
    d022 -> f091 "contains"
    d023 -> f092 "contains"
    d024 -> f093 "contains"
    d027 -> f094 "contains"
    d026 -> f095 "contains"
    d028 -> f096 "contains"
    d025 -> f097 "contains"
    d029 -> f098 "contains"
    d029 -> f099 "contains"
    d030 -> f100 "contains"
    d006 -> f101 "contains"
    d006 -> f102 "contains"
    d006 -> f103 "contains"
    d031 -> f104 "contains"
    d005 -> f105 "contains"
    d005 -> f106 "contains"
    d005 -> f107 "contains"
    d005 -> f108 "contains"
    d032 -> f109 "contains"
    d035 -> f110 "contains"
    d034 -> f111 "contains"
    d034 -> f112 "contains"
    d034 -> f113 "contains"
    d036 -> f114 "contains"
    d036 -> f115 "contains"
    d036 -> f116 "contains"
    d036 -> f117 "contains"
    d036 -> f118 "contains"
    d036 -> f119 "contains"
    d036 -> f120 "contains"
    d037 -> f121 "contains"
    d037 -> f122 "contains"
    d037 -> f123 "contains"
    d037 -> f124 "contains"
    d038 -> f125 "contains"
    d038 -> f126 "contains"
    d039 -> f127 "contains"
    d039 -> f128 "contains"
    d039 -> f129 "contains"
    d039 -> f130 "contains"
    d039 -> f131 "contains"
    d040 -> f132 "contains"
    d041 -> f133 "contains"
    d041 -> f134 "contains"
    d041 -> f135 "contains"
    d041 -> f136 "contains"
    d042 -> f137 "contains"
    d042 -> f138 "contains"
    d043 -> f139 "contains"
    d044 -> f140 "contains"
    d044 -> f141 "contains"
    d044 -> f142 "contains"
    d044 -> f143 "contains"
    d046 -> f144 "contains"
    d046 -> f145 "contains"
    d046 -> f146 "contains"
    d047 -> f147 "contains"
    d047 -> f148 "contains"
    d045 -> f149 "contains"
    d045 -> f150 "contains"
    d045 -> f151 "contains"
    d045 -> f152 "contains"
    d045 -> f153 "contains"
    d045 -> f154 "contains"
    d045 -> f155 "contains"
    d045 -> f156 "contains"
    d045 -> f157 "contains"
    d048 -> f158 "contains"
    d048 -> f159 "contains"
    d048 -> f160 "contains"
    d048 -> f161 "contains"
    d048 -> f162 "contains"
    d048 -> f163 "contains"
    d048 -> f164 "contains"
    d049 -> f165 "contains"
    d049 -> f166 "contains"
    d050 -> f167 "contains"
    d050 -> f168 "contains"
    d050 -> f169 "contains"
    d050 -> f170 "contains"
    d050 -> f171 "contains"
    d050 -> f172 "contains"
    d050 -> f173 "contains"
    d050 -> f174 "contains"
    d050 -> f175 "contains"
    d050 -> f176 "contains"
    d050 -> f177 "contains"
    d050 -> f178 "contains"
    d050 -> f179 "contains"
    d050 -> f180 "contains"
    d050 -> f181 "contains"
    d050 -> f182 "contains"
    d050 -> f183 "contains"
    d050 -> f184 "contains"
    d050 -> f185 "contains"
    d050 -> f186 "contains"
    d050 -> f187 "contains"
    d050 -> f188 "contains"
    d050 -> f189 "contains"
    d050 -> f190 "contains"
    d050 -> f191 "contains"
    d050 -> f192 "contains"
    d050 -> f193 "contains"
    d050 -> f194 "contains"
    d050 -> f195 "contains"
    d050 -> f196 "contains"
    d050 -> f197 "contains"
    d050 -> f198 "contains"
    d050 -> f199 "contains"
    d050 -> f200 "contains"
    d050 -> f201 "contains"
    d050 -> f202 "contains"
    d050 -> f203 "contains"
    d050 -> f204 "contains"
    d050 -> f205 "contains"
    d050 -> f206 "contains"
    d050 -> f207 "contains"
    d050 -> f208 "contains"
    d050 -> f209 "contains"
    d050 -> f210 "contains"
    d050 -> f211 "contains"
    d050 -> f212 "contains"
    d050 -> f213 "contains"
    d050 -> f214 "contains"
    d050 -> f215 "contains"
    d050 -> f216 "contains"
    d050 -> f217 "contains"
    d050 -> f218 "contains"
    d050 -> f219 "contains"
    d050 -> f220 "contains"
    d050 -> f221 "contains"
    d050 -> f222 "contains"
    d050 -> f223 "contains"
    d033 -> f224 "contains"
    d033 -> f225 "contains"
    d033 -> f226 "contains"
    d033 -> f227 "contains"
    d033 -> f228 "contains"
    d033 -> f229 "contains"
    d033 -> f230 "contains"
    d052 -> f231 "contains"
    d053 -> f232 "contains"
    d053 -> f233 "contains"
    d053 -> f234 "contains"
    d054 -> f235 "contains"
    d054 -> f236 "contains"
    d054 -> f237 "contains"
    d054 -> f238 "contains"
    d054 -> f239 "contains"
    d054 -> f240 "contains"
    d056 -> f241 "contains"
    d057 -> f242 "contains"
    d058 -> f243 "contains"
    d058 -> f244 "contains"
    d058 -> f245 "contains"
    d058 -> f246 "contains"
    d058 -> f247 "contains"
    d058 -> f248 "contains"
    d058 -> f249 "contains"
    d059 -> f250 "contains"
    d060 -> f251 "contains"
    d060 -> f252 "contains"
    d060 -> f253 "contains"
    d061 -> f254 "contains"
    d061 -> f255 "contains"
    d061 -> f256 "contains"
    d055 -> f257 "contains"
    d055 -> f258 "contains"
    d055 -> f259 "contains"
    d055 -> f260 "contains"
    d055 -> f261 "contains"
    d055 -> f262 "contains"
    d055 -> f263 "contains"
    d062 -> f264 "contains"
    d062 -> f265 "contains"
    d062 -> f266 "contains"
    d064 -> f267 "contains"
    d064 -> f268 "contains"
    d064 -> f269 "contains"
    d064 -> f270 "contains"
    d064 -> f271 "contains"
    d064 -> f272 "contains"
    d064 -> f273 "contains"
    d064 -> f274 "contains"
    d064 -> f275 "contains"
    d064 -> f276 "contains"
    d064 -> f277 "contains"
    d064 -> f278 "contains"
    d063 -> f279 "contains"
    d063 -> f280 "contains"
    d063 -> f281 "contains"
    d063 -> f282 "contains"
    d063 -> f283 "contains"
    d063 -> f284 "contains"
    d063 -> f285 "contains"
    d063 -> f286 "contains"
    d063 -> f287 "contains"
    d063 -> f288 "contains"
    d063 -> f289 "contains"
    d063 -> f290 "contains"
    d063 -> f291 "contains"
    d063 -> f292 "contains"
    d063 -> f293 "contains"
    d063 -> f294 "contains"
    d063 -> f295 "contains"
    d063 -> f296 "contains"
    d063 -> f297 "contains"
    d063 -> f298 "contains"
    d063 -> f299 "contains"
    d063 -> f300 "contains"
    d063 -> f301 "contains"
    d063 -> f302 "contains"
    d063 -> f303 "contains"
    d063 -> f304 "contains"
    d063 -> f305 "contains"
    d063 -> f306 "contains"
    d063 -> f307 "contains"
    d063 -> f308 "contains"
    d063 -> f309 "contains"
    d063 -> f310 "contains"
    d063 -> f311 "contains"
    d063 -> f312 "contains"
    d063 -> f313 "contains"
    d065 -> f314 "contains"
    d067 -> f315 "contains"
    d067 -> f316 "contains"
    d067 -> f317 "contains"
    d067 -> f318 "contains"
    d067 -> f319 "contains"
    d067 -> f320 "contains"
    d067 -> f321 "contains"
    d067 -> f322 "contains"
    d067 -> f323 "contains"
    d068 -> f324 "contains"
    d068 -> f325 "contains"
    d066 -> f326 "contains"
    d066 -> f327 "contains"
    d070 -> f328 "contains"
    d070 -> f329 "contains"
    d070 -> f330 "contains"
    d070 -> f331 "contains"
    d069 -> f332 "contains"
    d069 -> f333 "contains"
    d069 -> f334 "contains"
    d069 -> f335 "contains"
    d069 -> f336 "contains"
    d069 -> f337 "contains"
    d069 -> f338 "contains"
    d069 -> f339 "contains"
    d069 -> f340 "contains"
    d069 -> f341 "contains"
    d069 -> f342 "contains"
    d069 -> f343 "contains"
    d069 -> f344 "contains"
    d069 -> f345 "contains"
    d069 -> f346 "contains"
    d069 -> f347 "contains"
    d069 -> f348 "contains"
    d001 -> f349 "contains"
    d001 -> f350 "contains"
    d001 -> f351 "contains"
    d001 -> f352 "contains"
    d001 -> f353 "contains"
    d001 -> f354 "contains"
    d001 -> f355 "contains"
    d001 -> f356 "contains"
    d001 -> f357 "contains"
    d001 -> f358 "contains"
    d001 -> f359 "contains"
    d001 -> f360 "contains"
    d001 -> f361 "contains"
    d001 -> f362 "contains"
    d001 -> f363 "contains"
    d001 -> f364 "contains"
    f072 -> f175 "imports @/components/ui/button"
    f072 -> f193 "imports @/components/ui/input"
    f072 -> f205 "imports @/components/ui/select"
    f073 -> f172 "imports @/components/ui/badge"
    f073 -> f175 "imports @/components/ui/button"
    f073 -> f177 "imports @/components/ui/card"
    f073 -> f214 "imports @/components/ui/table"
    f073 -> f256 "imports @/lib/supabase/server"
    f073 -> f260 "imports @/lib/localization"
    f073 -> f257 "imports @/lib/audit-log"
    f073 -> f072 "imports ./activity-filters"
    f074 -> f256 "imports @/lib/supabase/server"
    f075 -> f110 "imports @/components/admin/settings/admin-settings-client"
    f075 -> f259 "imports @/lib/hotel-settings"
    f075 -> f256 "imports @/lib/supabase/server"
    f076 -> f111 "imports @/components/admin/edit-user-form"
    f076 -> f172 "imports @/components/ui/badge"
    f076 -> f175 "imports @/components/ui/button"
    f076 -> f177 "imports @/components/ui/card"
    f076 -> f256 "imports @/lib/supabase/server"
    f076 -> f260 "imports @/lib/localization"
    f076 -> f261 "imports @/lib/types"
    f077 -> f177 "imports @/components/ui/card"
    f077 -> f112 "imports @/components/admin/new-user-form"
    f078 -> f256 "imports @/lib/supabase/server"
    f078 -> f261 "imports @/lib/types"
    f078 -> f263 "imports @/lib/validation"
    f080 -> f256 "imports @/lib/supabase/server"
    f080 -> f177 "imports @/components/ui/card"
    f080 -> f175 "imports @/components/ui/button"
    f080 -> f113 "imports @/components/admin/users-table"
    f080 -> f261 "imports @/lib/types"
    f082 -> f177 "imports @/components/ui/card"
    f082 -> f256 "imports @/lib/supabase/server"
    f083 -> f256 "imports @/lib/supabase/server"
    f083 -> f177 "imports @/components/ui/card"
    f083 -> f215 "imports @/components/ui/tabs"
    f083 -> f126 "imports @/components/finance/payments-table"
    f083 -> f125 "imports @/components/finance/folios-table"
    f083 -> f260 "imports @/lib/localization"
    f083 -> f251 "imports @/lib/rules/payments"
    f084 -> f128 "imports @/components/front-desk/check-in-form"
    f084 -> f250 "imports @/lib/rooms/availability"
    f084 -> f259 "imports @/lib/hotel-settings"
    f084 -> f256 "imports @/lib/supabase/server"
    f084 -> f154 "imports @/components/reservations/reservation-actions"
    f084 -> f261 "imports @/lib/types"
    f085 -> f129 "imports @/components/front-desk/check-out-form"
    f085 -> f259 "imports @/lib/hotel-settings"
    f085 -> f256 "imports @/lib/supabase/server"
    f087 -> f256 "imports @/lib/supabase/server"
    f087 -> f215 "imports @/components/ui/tabs"
    f087 -> f127 "imports @/components/front-desk/arrivals-tab"
    f087 -> f130 "imports @/components/front-desk/departures-tab"
    f087 -> f131 "imports @/components/front-desk/in-house-tab"
    f088 -> f256 "imports @/lib/supabase/server"
    f088 -> f132 "imports @/components/guests/guests-client"
    f089 -> f256 "imports @/lib/supabase/server"
    f089 -> f132 "imports @/components/guests/guests-client"
    f090 -> f256 "imports @/lib/supabase/server"
    f090 -> f133 "imports @/components/housekeeping/housekeeping-client"
    f091 -> f256 "imports @/lib/supabase/server"
    f091 -> f137 "imports @/components/maintenance/maintenance-client"
    f092 -> f139 "imports @/components/profile/profile-settings"
    f092 -> f256 "imports @/lib/supabase/server"
    f093 -> f256 "imports @/lib/supabase/server"
    f093 -> f141 "imports @/components/reports/reports-client"
    f094 -> f256 "imports @/lib/supabase/server"
    f094 -> f175 "imports @/components/ui/button"
    f094 -> f150 "imports @/components/reservations/edit-reservation-form"
    f095 -> f256 "imports @/lib/supabase/server"
    f095 -> f177 "imports @/components/ui/card"
    f095 -> f172 "imports @/components/ui/badge"
    f095 -> f258 "imports @/lib/format"
    f095 -> f259 "imports @/lib/hotel-settings"
    f095 -> f251 "imports @/lib/rules/payments"
    f095 -> f241 "imports @/lib/i18n/uk"
    f095 -> f154 "imports @/components/reservations/reservation-actions"
    f095 -> f155 "imports @/components/reservations/reservation-status-timeline"
    f095 -> f157 "imports @/components/reservations/room-move-note"
    f095 -> f151 "imports @/components/reservations/folio-actions"
    f095 -> f261 "imports @/lib/types"
    f096 -> f256 "imports @/lib/supabase/server"
    f096 -> f153 "imports @/components/reservations/new-reservation-form"
    f096 -> f177 "imports @/components/ui/card"
    f096 -> f259 "imports @/lib/hotel-settings"
    f097 -> f256 "imports @/lib/supabase/server"
    f097 -> f177 "imports @/components/ui/card"
    f097 -> f175 "imports @/components/ui/button"
    f097 -> f156 "imports @/components/reservations/reservations-table"
    f097 -> f229 "imports @/components/stat-card"
    f097 -> f258 "imports @/lib/format"
    f097 -> f259 "imports @/lib/hotel-settings"
    f099 -> f256 "imports @/lib/supabase/server"
    f099 -> f161 "imports @/components/room-rack/room-rack-client"
    f099 -> f249 "imports @/lib/room-rack/types"
    f100 -> f256 "imports @/lib/supabase/server"
    f100 -> f175 "imports @/components/ui/button"
    f100 -> f177 "imports @/components/ui/card"
    f100 -> f172 "imports @/components/ui/badge"
    f100 -> f260 "imports @/lib/localization"
    f100 -> f115 "imports @/components/dashboards/dashboard-primitives"
    f100 -> f165 "imports @/components/rooms/room-class-filter"
    f100 -> f166 "imports @/components/rooms/room-type-cards"
    f100 -> f250 "imports @/lib/rooms/availability"
    f100 -> f261 "imports @/lib/types"
    f100 -> f262 "imports @/lib/utils"
    f102 -> f256 "imports @/lib/supabase/server"
    f102 -> f225 "imports @/components/dashboard-nav"
    f102 -> f224 "imports @/components/dashboard-header"
    f102 -> f208 "imports @/components/ui/sidebar"
    f103 -> f256 "imports @/lib/supabase/server"
    f103 -> f116 "imports @/components/dashboards/front-desk-dashboard"
    f103 -> f114 "imports @/components/dashboards/admin-dashboard"
    f103 -> f117 "imports @/components/dashboards/housekeeping-dashboard"
    f103 -> f120 "imports @/components/dashboards/manager-dashboard"
    f103 -> f118 "imports @/components/dashboards/maintenance-dashboard"
    f104 -> f254 "imports @/lib/supabase/client"
    f104 -> f175 "imports @/components/ui/button"
    f104 -> f177 "imports @/components/ui/card"
    f104 -> f193 "imports @/components/ui/input"
    f104 -> f196 "imports @/components/ui/label"
    f104 -> f263 "imports @/lib/validation"
    f107 -> f211 "imports @/components/ui/sonner"
    f107 -> f106 "imports ./globals.css"
    f108 -> f256 "imports @/lib/supabase/server"
    f110 -> f074 "imports @/app/dashboard/admin/settings/actions"
    f110 -> f169 "imports @/components/ui/alert"
    f110 -> f172 "imports @/components/ui/badge"
    f110 -> f175 "imports @/components/ui/button"
    f110 -> f177 "imports @/components/ui/card"
    f110 -> f180 "imports @/components/ui/checkbox"
    f110 -> f184 "imports @/components/ui/dialog"
    f110 -> f193 "imports @/components/ui/input"
    f110 -> f196 "imports @/components/ui/label"
    f110 -> f205 "imports @/components/ui/select"
    f110 -> f214 "imports @/components/ui/table"
    f110 -> f215 "imports @/components/ui/tabs"
    f110 -> f216 "imports @/components/ui/textarea"
    f110 -> f167 "imports @/components/ui/accordion"
    f110 -> f260 "imports @/lib/localization"
    f110 -> f258 "imports @/lib/format"
    f111 -> f078 "imports @/app/dashboard/admin/users/actions"
    f111 -> f169 "imports @/components/ui/alert"
    f111 -> f175 "imports @/components/ui/button"
    f111 -> f177 "imports @/components/ui/card"
    f111 -> f193 "imports @/components/ui/input"
    f111 -> f196 "imports @/components/ui/label"
    f111 -> f205 "imports @/components/ui/select"
    f111 -> f213 "imports @/components/ui/switch"
    f111 -> f261 "imports @/lib/types"
    f111 -> f260 "imports @/lib/localization"
    f111 -> f263 "imports @/lib/validation"
    f112 -> f078 "imports @/app/dashboard/admin/users/actions"
    f112 -> f175 "imports @/components/ui/button"
    f112 -> f193 "imports @/components/ui/input"
    f112 -> f196 "imports @/components/ui/label"
    f112 -> f205 "imports @/components/ui/select"
    f112 -> f213 "imports @/components/ui/switch"
    f112 -> f263 "imports @/lib/validation"
    f113 -> f172 "imports @/components/ui/badge"
    f113 -> f175 "imports @/components/ui/button"
    f113 -> f193 "imports @/components/ui/input"
    f113 -> f205 "imports @/components/ui/select"
    f113 -> f214 "imports @/components/ui/table"
    f113 -> f260 "imports @/lib/localization"
    f113 -> f261 "imports @/lib/types"
    f114 -> f177 "imports @/components/ui/card"
    f114 -> f175 "imports @/components/ui/button"
    f114 -> f256 "imports @/lib/supabase/server"
    f114 -> f261 "imports @/lib/types"
    f114 -> f115 "imports ./dashboard-primitives"
    f115 -> f175 "imports @/components/ui/button"
    f115 -> f177 "imports @/components/ui/card"
    f115 -> f262 "imports @/lib/utils"
    f116 -> f175 "imports @/components/ui/button"
    f116 -> f177 "imports @/components/ui/card"
    f116 -> f115 "imports @/components/dashboards/dashboard-primitives"
    f116 -> f256 "imports @/lib/supabase/server"
    f116 -> f261 "imports @/lib/types"
    f117 -> f177 "imports @/components/ui/card"
    f117 -> f175 "imports @/components/ui/button"
    f117 -> f172 "imports @/components/ui/badge"
    f117 -> f205 "imports @/components/ui/select"
    f117 -> f184 "imports @/components/ui/dialog"
    f117 -> f216 "imports @/components/ui/textarea"
    f117 -> f196 "imports @/components/ui/label"
    f117 -> f193 "imports @/components/ui/input"
    f117 -> f201 "imports @/components/ui/progress"
    f117 -> f206 "imports @/components/ui/separator"
    f117 -> f215 "imports @/components/ui/tabs"
    f117 -> f254 "imports @/lib/supabase/client"
    f117 -> f260 "imports @/lib/localization"
    f117 -> f261 "imports @/lib/types"
    f117 -> f115 "imports ./dashboard-primitives"
    f117 -> f253 "imports @/lib/rules/transitions"
    f118 -> f172 "imports @/components/ui/badge"
    f118 -> f175 "imports @/components/ui/button"
    f118 -> f177 "imports @/components/ui/card"
    f118 -> f180 "imports @/components/ui/checkbox"
    f118 -> f184 "imports @/components/ui/dialog"
    f118 -> f186 "imports @/components/ui/dropdown-menu"
    f118 -> f193 "imports @/components/ui/input"
    f118 -> f196 "imports @/components/ui/label"
    f118 -> f201 "imports @/components/ui/progress"
    f118 -> f205 "imports @/components/ui/select"
    f118 -> f206 "imports @/components/ui/separator"
    f118 -> f214 "imports @/components/ui/table"
    f118 -> f215 "imports @/components/ui/tabs"
    f118 -> f216 "imports @/components/ui/textarea"
    f118 -> f254 "imports @/lib/supabase/client"
    f118 -> f115 "imports @/components/dashboards/dashboard-primitives"
    f118 -> f260 "imports @/lib/localization"
    f118 -> f262 "imports @/lib/utils"
    f118 -> f261 "imports @/lib/types"
    f119 -> f177 "imports @/components/ui/card"
    f120 -> f175 "imports @/components/ui/button"
    f120 -> f177 "imports @/components/ui/card"
    f120 -> f256 "imports @/lib/supabase/server"
    f120 -> f261 "imports @/lib/types"
    f120 -> f251 "imports @/lib/rules/payments"
    f120 -> f115 "imports ./dashboard-primitives"
    f120 -> f119 "imports ./manager-charts"
    f121 -> f175 "imports @/components/ui/button"
    f121 -> f180 "imports @/components/ui/checkbox"
    f121 -> f181 "imports @/components/ui/collapsible"
    f121 -> f193 "imports @/components/ui/input"
    f121 -> f200 "imports @/components/ui/popover"
    f121 -> f204 "imports @/components/ui/scroll-area"
    f121 -> f206 "imports @/components/ui/separator"
    f121 -> f262 "imports @/lib/utils"
    f121 -> f122 "imports @/components/data-table/filter-utils"
    f121 -> f124 "imports @/components/data-table/types"
    f123 -> f122 "imports @/components/data-table/filter-utils"
    f123 -> f124 "imports @/components/data-table/types"
    f125 -> f226 "imports @/components/data-table"
    f125 -> f172 "imports @/components/ui/badge"
    f125 -> f175 "imports @/components/ui/button"
    f125 -> f260 "imports @/lib/localization"
    f126 -> f226 "imports @/components/data-table"
    f126 -> f172 "imports @/components/ui/badge"
    f126 -> f260 "imports @/lib/localization"
    f126 -> f241 "imports @/lib/i18n/uk"
    f126 -> f261 "imports @/lib/types"
    f127 -> f175 "imports @/components/ui/button"
    f127 -> f177 "imports @/components/ui/card"
    f127 -> f193 "imports @/components/ui/input"
    f127 -> f172 "imports @/components/ui/badge"
    f127 -> f260 "imports @/lib/localization"
    f128 -> f254 "imports @/lib/supabase/client"
    f128 -> f258 "imports @/lib/format"
    f128 -> f259 "imports @/lib/hotel-settings"
    f128 -> f252 "imports @/lib/rules/prepayment"
    f128 -> f251 "imports @/lib/rules/payments"
    f128 -> f253 "imports @/lib/rules/transitions"
    f128 -> f250 "imports @/lib/rooms/availability"
    f128 -> f260 "imports @/lib/localization"
    f128 -> f241 "imports @/lib/i18n/uk"
    f128 -> f261 "imports @/lib/types"
    f128 -> f169 "imports @/components/ui/alert"
    f128 -> f172 "imports @/components/ui/badge"
    f128 -> f175 "imports @/components/ui/button"
    f128 -> f177 "imports @/components/ui/card"
    f128 -> f180 "imports @/components/ui/checkbox"
    f128 -> f193 "imports @/components/ui/input"
    f128 -> f196 "imports @/components/ui/label"
    f128 -> f202 "imports @/components/ui/radio-group"
    f128 -> f205 "imports @/components/ui/select"
    f128 -> f206 "imports @/components/ui/separator"
    f128 -> f216 "imports @/components/ui/textarea"
    f128 -> f157 "imports @/components/reservations/room-move-note"
    f129 -> f254 "imports @/lib/supabase/client"
    f129 -> f258 "imports @/lib/format"
    f129 -> f259 "imports @/lib/hotel-settings"
    f129 -> f253 "imports @/lib/rules/transitions"
    f129 -> f251 "imports @/lib/rules/payments"
    f129 -> f241 "imports @/lib/i18n/uk"
    f129 -> f261 "imports @/lib/types"
    f129 -> f169 "imports @/components/ui/alert"
    f129 -> f172 "imports @/components/ui/badge"
    f129 -> f175 "imports @/components/ui/button"
    f129 -> f177 "imports @/components/ui/card"
    f129 -> f180 "imports @/components/ui/checkbox"
    f129 -> f193 "imports @/components/ui/input"
    f129 -> f196 "imports @/components/ui/label"
    f129 -> f205 "imports @/components/ui/select"
    f129 -> f206 "imports @/components/ui/separator"
    f129 -> f157 "imports @/components/reservations/room-move-note"
    f129 -> f216 "imports @/components/ui/textarea"
    f130 -> f175 "imports @/components/ui/button"
    f130 -> f177 "imports @/components/ui/card"
    f130 -> f193 "imports @/components/ui/input"
    f130 -> f172 "imports @/components/ui/badge"
    f130 -> f260 "imports @/lib/localization"
    f131 -> f175 "imports @/components/ui/button"
    f131 -> f177 "imports @/components/ui/card"
    f131 -> f193 "imports @/components/ui/input"
    f131 -> f172 "imports @/components/ui/badge"
    f131 -> f260 "imports @/lib/localization"
    f132 -> f177 "imports @/components/ui/card"
    f132 -> f175 "imports @/components/ui/button"
    f132 -> f172 "imports @/components/ui/badge"
    f132 -> f193 "imports @/components/ui/input"
    f132 -> f196 "imports @/components/ui/label"
    f132 -> f216 "imports @/components/ui/textarea"
    f132 -> f205 "imports @/components/ui/select"
    f132 -> f184 "imports @/components/ui/dialog"
    f132 -> f215 "imports @/components/ui/tabs"
    f132 -> f213 "imports @/components/ui/switch"
    f132 -> f206 "imports @/components/ui/separator"
    f132 -> f169 "imports @/components/ui/alert"
    f132 -> f226 "imports @/components/data-table"
    f132 -> f254 "imports @/lib/supabase/client"
    f132 -> f261 "imports @/lib/types"
    f132 -> f260 "imports @/lib/localization"
    f132 -> f241 "imports @/lib/i18n/uk"
    f132 -> f263 "imports @/lib/validation"
    f133 -> f177 "imports @/components/ui/card"
    f133 -> f175 "imports @/components/ui/button"
    f133 -> f172 "imports @/components/ui/badge"
    f133 -> f193 "imports @/components/ui/input"
    f133 -> f215 "imports @/components/ui/tabs"
    f133 -> f205 "imports @/components/ui/select"
    f133 -> f184 "imports @/components/ui/dialog"
    f133 -> f196 "imports @/components/ui/label"
    f133 -> f216 "imports @/components/ui/textarea"
    f133 -> f254 "imports @/lib/supabase/client"
    f133 -> f261 "imports @/lib/types"
    f133 -> f134 "imports ./housekeeping-kanban"
    f133 -> f260 "imports @/lib/localization"
    f133 -> f253 "imports @/lib/rules/transitions"
    f134 -> f177 "imports @/components/ui/card"
    f134 -> f172 "imports @/components/ui/badge"
    f134 -> f175 "imports @/components/ui/button"
    f134 -> f193 "imports @/components/ui/input"
    f134 -> f205 "imports @/components/ui/select"
    f134 -> f184 "imports @/components/ui/dialog"
    f134 -> f260 "imports @/lib/localization"
    f135 -> f177 "imports @/components/ui/card"
    f135 -> f172 "imports @/components/ui/badge"
    f135 -> f175 "imports @/components/ui/button"
    f135 -> f205 "imports @/components/ui/select"
    f135 -> f254 "imports @/lib/supabase/client"
    f135 -> f260 "imports @/lib/localization"
    f135 -> f261 "imports @/lib/types"
    f136 -> f177 "imports @/components/ui/card"
    f136 -> f172 "imports @/components/ui/badge"
    f136 -> f175 "imports @/components/ui/button"
    f136 -> f205 "imports @/components/ui/select"
    f136 -> f254 "imports @/lib/supabase/client"
    f136 -> f260 "imports @/lib/localization"
    f136 -> f253 "imports @/lib/rules/transitions"
    f137 -> f177 "imports @/components/ui/card"
    f137 -> f175 "imports @/components/ui/button"
    f137 -> f172 "imports @/components/ui/badge"
    f137 -> f193 "imports @/components/ui/input"
    f137 -> f196 "imports @/components/ui/label"
    f137 -> f216 "imports @/components/ui/textarea"
    f137 -> f205 "imports @/components/ui/select"
    f137 -> f184 "imports @/components/ui/dialog"
    f137 -> f215 "imports @/components/ui/tabs"
    f137 -> f201 "imports @/components/ui/progress"
    f137 -> f254 "imports @/lib/supabase/client"
    f137 -> f260 "imports @/lib/localization"
    f137 -> f261 "imports @/lib/types"
    f138 -> f177 "imports @/components/ui/card"
    f138 -> f172 "imports @/components/ui/badge"
    f138 -> f175 "imports @/components/ui/button"
    f138 -> f205 "imports @/components/ui/select"
    f138 -> f254 "imports @/lib/supabase/client"
    f138 -> f260 "imports @/lib/localization"
    f139 -> f169 "imports @/components/ui/alert"
    f139 -> f172 "imports @/components/ui/badge"
    f139 -> f175 "imports @/components/ui/button"
    f139 -> f177 "imports @/components/ui/card"
    f139 -> f193 "imports @/components/ui/input"
    f139 -> f196 "imports @/components/ui/label"
    f139 -> f254 "imports @/lib/supabase/client"
    f139 -> f260 "imports @/lib/localization"
    f139 -> f263 "imports @/lib/validation"
    f140 -> f177 "imports @/components/ui/card"
    f140 -> f172 "imports @/components/ui/badge"
    f141 -> f175 "imports @/components/ui/button"
    f141 -> f177 "imports @/components/ui/card"
    f141 -> f176 "imports @/components/ui/calendar"
    f141 -> f196 "imports @/components/ui/label"
    f141 -> f200 "imports @/components/ui/popover"
    f141 -> f205 "imports @/components/ui/select"
    f141 -> f262 "imports @/lib/utils"
    f141 -> f260 "imports @/lib/localization"
    f141 -> f242 "imports @/lib/reports/hotel-reporting"
    f141 -> f251 "imports @/lib/rules/payments"
    f142 -> f177 "imports @/components/ui/card"
    f142 -> f172 "imports @/components/ui/badge"
    f142 -> f260 "imports @/lib/localization"
    f143 -> f177 "imports @/components/ui/card"
    f144 -> f175 "imports @/components/ui/button"
    f144 -> f193 "imports @/components/ui/input"
    f144 -> f196 "imports @/components/ui/label"
    f144 -> f176 "imports @/components/ui/calendar"
    f144 -> f200 "imports @/components/ui/popover"
    f144 -> f262 "imports @/lib/utils"
    f144 -> f244 "imports @/lib/room-rack/date-utils"
    f144 -> f152 "imports ../form-context"
    f145 -> f175 "imports @/components/ui/button"
    f145 -> f196 "imports @/components/ui/label"
    f145 -> f216 "imports @/components/ui/textarea"
    f145 -> f258 "imports @/lib/format"
    f145 -> f152 "imports ../form-context"
    f145 -> f147 "imports ../ui/guest-lookup-input"
    f146 -> f175 "imports @/components/ui/button"
    f146 -> f193 "imports @/components/ui/input"
    f146 -> f196 "imports @/components/ui/label"
    f146 -> f205 "imports @/components/ui/select"
    f146 -> f172 "imports @/components/ui/badge"
    f146 -> f202 "imports @/components/ui/radio-group"
    f146 -> f258 "imports @/lib/format"
    f146 -> f262 "imports @/lib/utils"
    f146 -> f250 "imports @/lib/rooms/availability"
    f146 -> f152 "imports ../form-context"
    f146 -> f148 "imports ../ui/pricing-summary"
    f147 -> f175 "imports @/components/ui/button"
    f147 -> f193 "imports @/components/ui/input"
    f147 -> f196 "imports @/components/ui/label"
    f147 -> f172 "imports @/components/ui/badge"
    f147 -> f219 "imports @/components/ui/toggle-group"
    f147 -> f152 "imports ../form-context"
    f148 -> f258 "imports @/lib/format"
    f148 -> f152 "imports ../form-context"
    f150 -> f254 "imports @/lib/supabase/client"
    f150 -> f175 "imports @/components/ui/button"
    f150 -> f193 "imports @/components/ui/input"
    f150 -> f196 "imports @/components/ui/label"
    f150 -> f216 "imports @/components/ui/textarea"
    f150 -> f176 "imports @/components/ui/calendar"
    f150 -> f200 "imports @/components/ui/popover"
    f150 -> f177 "imports @/components/ui/card"
    f150 -> f169 "imports @/components/ui/alert"
    f150 -> f172 "imports @/components/ui/badge"
    f150 -> f262 "imports @/lib/utils"
    f150 -> f241 "imports @/lib/i18n/uk"
    f150 -> f157 "imports @/components/reservations/room-move-note"
    f151 -> f254 "imports @/lib/supabase/client"
    f151 -> f258 "imports @/lib/format"
    f151 -> f259 "imports @/lib/hotel-settings"
    f151 -> f241 "imports @/lib/i18n/uk"
    f151 -> f261 "imports @/lib/types"
    f151 -> f169 "imports @/components/ui/alert"
    f151 -> f175 "imports @/components/ui/button"
    f151 -> f184 "imports @/components/ui/dialog"
    f151 -> f193 "imports @/components/ui/input"
    f151 -> f196 "imports @/components/ui/label"
    f151 -> f205 "imports @/components/ui/select"
    f151 -> f216 "imports @/components/ui/textarea"
    f152 -> f254 "imports @/lib/supabase/client"
    f152 -> f259 "imports @/lib/hotel-settings"
    f152 -> f252 "imports @/lib/rules/prepayment"
    f152 -> f244 "imports @/lib/room-rack/date-utils"
    f152 -> f250 "imports @/lib/rooms/availability"
    f152 -> f263 "imports @/lib/validation"
    f153 -> f262 "imports @/lib/utils"
    f153 -> f152 "imports ./form-context"
    f153 -> f144 "imports ./steps/step-dates-guests"
    f153 -> f146 "imports ./steps/step-room-rate"
    f153 -> f145 "imports ./steps/step-guest-confirm"
    f154 -> f254 "imports @/lib/supabase/client"
    f154 -> f258 "imports @/lib/format"
    f154 -> f259 "imports @/lib/hotel-settings"
    f154 -> f252 "imports @/lib/rules/prepayment"
    f154 -> f251 "imports @/lib/rules/payments"
    f154 -> f253 "imports @/lib/rules/transitions"
    f154 -> f241 "imports @/lib/i18n/uk"
    f154 -> f261 "imports @/lib/types"
    f154 -> f169 "imports @/components/ui/alert"
    f154 -> f175 "imports @/components/ui/button"
    f154 -> f184 "imports @/components/ui/dialog"
    f154 -> f193 "imports @/components/ui/input"
    f154 -> f196 "imports @/components/ui/label"
    f154 -> f202 "imports @/components/ui/radio-group"
    f154 -> f216 "imports @/components/ui/textarea"
    f155 -> f262 "imports @/lib/utils"
    f155 -> f241 "imports @/lib/i18n/uk"
    f156 -> f226 "imports @/components/data-table"
    f156 -> f172 "imports @/components/ui/badge"
    f156 -> f175 "imports @/components/ui/button"
    f156 -> f260 "imports @/lib/localization"
    f157 -> f262 "imports @/lib/utils"
    f158 -> f168 "imports @/components/ui/alert-dialog"
    f158 -> f206 "imports @/components/ui/separator"
    f158 -> f212 "imports @/components/ui/spinner"
    f158 -> f249 "imports @/lib/room-rack/types"
    f158 -> f245 "imports @/lib/room-rack/errors"
    f158 -> f241 "imports @/lib/i18n/uk"
    f158 -> f244 "imports @/lib/room-rack/date-utils"
    f158 -> f262 "imports @/lib/utils"
    f159 -> f261 "imports @/lib/types"
    f159 -> f241 "imports @/lib/i18n/uk"
    f159 -> f249 "imports @/lib/room-rack/types"
    f159 -> f262 "imports @/lib/utils"
    f160 -> f175 "imports @/components/ui/button"
    f160 -> f172 "imports @/components/ui/badge"
    f160 -> f206 "imports @/components/ui/separator"
    f160 -> f204 "imports @/components/ui/scroll-area"
    f160 -> f241 "imports @/lib/i18n/uk"
    f160 -> f249 "imports @/lib/room-rack/types"
    f160 -> f159 "imports ./reservation-block"
    f160 -> f262 "imports @/lib/utils"
    f160 -> f244 "imports @/lib/room-rack/date-utils"
    f160 -> f157 "imports @/components/reservations/room-move-note"
    f161 -> f254 "imports @/lib/supabase/client"
    f161 -> f249 "imports @/lib/room-rack/types"
    f161 -> f244 "imports @/lib/room-rack/date-utils"
    f161 -> f243 "imports @/lib/room-rack/availability"
    f161 -> f246 "imports @/lib/room-rack/filters"
    f161 -> f247 "imports @/lib/room-rack/kpi"
    f161 -> f248 "imports @/lib/room-rack/pricing"
    f161 -> f245 "imports @/lib/room-rack/errors"
    f161 -> f237 "imports @/hooks/use-media-query"
    f161 -> f164 "imports ./room-rack-toolbar"
    f161 -> f163 "imports ./room-rack-legend"
    f161 -> f162 "imports ./room-rack-grid"
    f161 -> f160 "imports ./reservation-details-panel"
    f161 -> f158 "imports ./confirm-move-dialog"
    f161 -> f207 "imports @/components/ui/sheet"
    f162 -> f249 "imports @/lib/room-rack/types"
    f162 -> f241 "imports @/lib/i18n/uk"
    f162 -> f260 "imports @/lib/localization"
    f162 -> f262 "imports @/lib/utils"
    f162 -> f159 "imports ./reservation-block"
    f162 -> f244 "imports @/lib/room-rack/date-utils"
    f163 -> f241 "imports @/lib/i18n/uk"
    f163 -> f175 "imports @/components/ui/button"
    f163 -> f180 "imports @/components/ui/checkbox"
    f163 -> f262 "imports @/lib/utils"
    f163 -> f246 "imports @/lib/room-rack/filters"
    f163 -> f159 "imports ./reservation-block"
    f164 -> f175 "imports @/components/ui/button"
    f164 -> f193 "imports @/components/ui/input"
    f164 -> f205 "imports @/components/ui/select"
    f164 -> f219 "imports @/components/ui/toggle-group"
    f164 -> f249 "imports @/lib/room-rack/types"
    f164 -> f241 "imports @/lib/i18n/uk"
    f164 -> f244 "imports @/lib/room-rack/date-utils"
    f164 -> f262 "imports @/lib/utils"
    f165 -> f205 "imports @/components/ui/select"
    f166 -> f172 "imports @/components/ui/badge"
    f166 -> f177 "imports @/components/ui/card"
    f166 -> f184 "imports @/components/ui/dialog"
    f166 -> f258 "imports @/lib/format"
    f166 -> f250 "imports @/lib/rooms/availability"
    f167 -> f262 "imports @/lib/utils"
    f168 -> f262 "imports @/lib/utils"
    f168 -> f175 "imports @/components/ui/button"
    f169 -> f262 "imports @/lib/utils"
    f171 -> f262 "imports @/lib/utils"
    f172 -> f262 "imports @/lib/utils"
    f173 -> f262 "imports @/lib/utils"
    f174 -> f262 "imports @/lib/utils"
    f174 -> f206 "imports @/components/ui/separator"
    f175 -> f262 "imports @/lib/utils"
    f176 -> f262 "imports @/lib/utils"
    f176 -> f175 "imports @/components/ui/button"
    f177 -> f262 "imports @/lib/utils"
    f178 -> f262 "imports @/lib/utils"
    f178 -> f175 "imports @/components/ui/button"
    f179 -> f262 "imports @/lib/utils"
    f180 -> f262 "imports @/lib/utils"
    f182 -> f262 "imports @/lib/utils"
    f182 -> f184 "imports @/components/ui/dialog"
    f183 -> f262 "imports @/lib/utils"
    f184 -> f262 "imports @/lib/utils"
    f185 -> f262 "imports @/lib/utils"
    f186 -> f262 "imports @/lib/utils"
    f187 -> f262 "imports @/lib/utils"
    f188 -> f262 "imports @/lib/utils"
    f188 -> f196 "imports @/components/ui/label"
    f188 -> f206 "imports @/components/ui/separator"
    f189 -> f262 "imports @/lib/utils"
    f189 -> f196 "imports @/components/ui/label"
    f190 -> f262 "imports @/lib/utils"
    f191 -> f262 "imports @/lib/utils"
    f191 -> f175 "imports @/components/ui/button"
    f191 -> f193 "imports @/components/ui/input"
    f191 -> f216 "imports @/components/ui/textarea"
    f192 -> f262 "imports @/lib/utils"
    f193 -> f262 "imports @/lib/utils"
    f194 -> f262 "imports @/lib/utils"
    f194 -> f206 "imports @/components/ui/separator"
    f195 -> f262 "imports @/lib/utils"
    f196 -> f262 "imports @/lib/utils"
    f197 -> f262 "imports @/lib/utils"
    f198 -> f262 "imports @/lib/utils"
    f199 -> f262 "imports @/lib/utils"
    f199 -> f175 "imports @/components/ui/button"
    f200 -> f262 "imports @/lib/utils"
    f201 -> f262 "imports @/lib/utils"
    f202 -> f262 "imports @/lib/utils"
    f203 -> f262 "imports @/lib/utils"
    f204 -> f262 "imports @/lib/utils"
    f205 -> f262 "imports @/lib/utils"
    f206 -> f262 "imports @/lib/utils"
    f207 -> f262 "imports @/lib/utils"
    f208 -> f238 "imports @/hooks/use-mobile"
    f208 -> f262 "imports @/lib/utils"
    f208 -> f175 "imports @/components/ui/button"
    f208 -> f193 "imports @/components/ui/input"
    f208 -> f206 "imports @/components/ui/separator"
    f208 -> f207 "imports @/components/ui/sheet"
    f208 -> f209 "imports @/components/ui/skeleton"
    f208 -> f221 "imports @/components/ui/tooltip"
    f209 -> f262 "imports @/lib/utils"
    f210 -> f262 "imports @/lib/utils"
    f212 -> f262 "imports @/lib/utils"
    f213 -> f262 "imports @/lib/utils"
    f214 -> f262 "imports @/lib/utils"
    f215 -> f262 "imports @/lib/utils"
    f216 -> f262 "imports @/lib/utils"
    f217 -> f262 "imports @/lib/utils"
    f218 -> f240 "imports @/hooks/use-toast"
    f218 -> f217 "imports @/components/ui/toast"
    f219 -> f262 "imports @/lib/utils"
    f219 -> f220 "imports @/components/ui/toggle"
    f220 -> f262 "imports @/lib/utils"
    f221 -> f262 "imports @/lib/utils"
    f223 -> f217 "imports @/components/ui/toast"
    f224 -> f175 "imports @/components/ui/button"
    f224 -> f193 "imports @/components/ui/input"
    f224 -> f208 "imports @/components/ui/sidebar"
    f224 -> f186 "imports @/components/ui/dropdown-menu"
    f224 -> f254 "imports @/lib/supabase/client"
    f224 -> f260 "imports @/lib/localization"
    f225 -> f262 "imports @/lib/utils"
    f225 -> f208 "imports @/components/ui/sidebar"
    f226 -> f214 "imports @/components/ui/table"
    f226 -> f175 "imports @/components/ui/button"
    f226 -> f193 "imports @/components/ui/input"
    f226 -> f121 "imports @/components/data-table/column-header-menu"
    f226 -> f123 "imports @/components/data-table/table-logic"
    f226 -> f239 "imports @/hooks/use-table-url-sync"
    f226 -> f262 "imports @/lib/utils"
    f227 -> f196 "imports @/components/ui/label"
    f227 -> f262 "imports @/lib/utils"
    f228 -> f177 "imports @/components/ui/card"
    f228 -> f250 "imports @/lib/rooms/availability"
    f228 -> f261 "imports @/lib/types"
    f228 -> f262 "imports @/lib/utils"
    f229 -> f177 "imports @/components/ui/card"
    f235 -> f236 "imports @/hooks/table-url-sync-utils"
    f236 -> f124 "imports @/components/data-table/types"
    f239 -> f236 "imports @/hooks/table-url-sync-utils"
    f240 -> f217 "imports @/components/ui/toast"
    f241 -> f261 "imports @/lib/types"
    f243 -> f249 "imports ./types"
    f243 -> f244 "imports ./date-utils"
    f244 -> f241 "imports @/lib/i18n/uk"
    f244 -> f249 "imports ./types"
    f245 -> f244 "imports @/lib/room-rack/date-utils"
    f246 -> f249 "imports ./types"
    f246 -> f250 "imports @/lib/rooms/availability"
    f247 -> f249 "imports ./types"
    f248 -> f244 "imports ./date-utils"
    f248 -> f249 "imports ./types"
    f249 -> f261 "imports @/lib/types"
    f250 -> f261 "imports @/lib/types"
    f252 -> f261 "imports @/lib/types"
    f253 -> f261 "imports @/lib/types"
    f258 -> f259 "imports @/lib/hotel-settings"
    f260 -> f261 "imports @/lib/types"
    f328 -> f123 "imports @/components/data-table/table-logic"
    f329 -> f123 "imports @/components/data-table/table-logic"
    f329 -> f261 "imports @/lib/types"
    f330 -> f123 "imports @/components/data-table/table-logic"
    f331 -> f249 "imports @/lib/room-rack/types"
    f333 -> f328 "imports @/tests/support/create-headless-table"
    f333 -> f329 "imports @/tests/support/reservations-table-model"
    f334 -> f122 "imports @/components/data-table/filter-utils"
    f334 -> f123 "imports @/components/data-table/table-logic"
    f334 -> f235 "imports @/hooks/table-url-state"
    f334 -> f330 "imports @/tests/support/reservations.fixture"
    f335 -> f235 "imports @/hooks/table-url-state"
    f335 -> f329 "imports @/tests/support/reservations-table-model"
    f336 -> f242 "imports @/lib/reports/hotel-reporting"
    f338 -> f260 "imports @/lib/localization"
    f339 -> f251 "imports @/lib/rules/payments"
    f340 -> f252 "imports @/lib/rules/prepayment"
    f341 -> f097 "imports @/app/dashboard/reservations/page"
    f341 -> f256 "imports @/lib/supabase/server"
    f342 -> f250 "imports @/lib/rooms/availability"
    f343 -> f245 "imports @/lib/room-rack/errors"
    f344 -> f246 "imports @/lib/room-rack/filters"
    f344 -> f250 "imports @/lib/rooms/availability"
    f344 -> f331 "imports @/tests/support/room-rack.fixture"
    f345 -> f247 "imports @/lib/room-rack/kpi"
    f345 -> f249 "imports @/lib/room-rack/types"
    f346 -> f248 "imports @/lib/room-rack/pricing"
    f346 -> f249 "imports @/lib/room-rack/types"
    f347 -> f253 "imports @/lib/rules/transitions"
    f348 -> f263 "imports @/lib/validation"
    f360 -> f255 "imports @/lib/supabase/proxy"
    f084 -> rbHeader "renders"
    f084 -> rbSupabaseRead "loads data"
    rbSupabaseRead -> supabase "queries auth/reservations/settings/profile/rooms"
    f084 -> rbExpiredActions "conditionally renders"
    rbExpiredActions -> f154 "uses"
    f128 -> rbDetails "renders"
    f128 -> rbCheckIn "renders"
    rbCheckIn -> rbAssignedRoom "if room already assigned"
    rbAssignedRoom -> f157 "renders move note"
    rbCheckIn -> rbRoomPicker "if room assignment needed"
    rbCheckIn -> rbEarly "if today is before planned check-in"
    rbCheckIn -> rbPayment "if balance remains"
    rbCheckIn -> rbNotes "always renders"
    rbCheckIn -> rbBlockers "when validation blocks submit or error exists"
    rbCheckIn -> rbSubmit "renders"
    f128 -> rbSubmit "handles confirm check-in click"
    rbSubmit -> rbSupabaseWrite "calls handleCheckIn"
    rbSupabaseWrite -> supabase "re-checks and updates rooms/reservation_rooms/payments/reservations"
    rbSubmit -> rbRouter "navigates on success"
    rbRouter -> nextRuntime "uses next/navigation router"
    f128 -> lucide "uses AlertCircle, CheckCircle, Loader2, LockKeyhole icons"
  }
  views {
    systemContext aura "System_Context" {
      include *
      autolayout lr
      title "AuraStay system context"
    }
    container aura "Containers" {
      include *
      autolayout lr
      title "AuraStay containers and external systems"
    }
    component codebase "File_Structure_Full" {
      include *
      autolayout lr
      title "Full repository file/folder structure and imports"
      description "Large inventory view: every tracked local folder/file except .git, node_modules and .next, with contains/imports relationships."
    }
    component codebase "Root_File_Map" {
      include d001
      include d002
      include d005
      include d032
      include d033
      include d051
      include d054
      include d055
      include d062
      include d063
      include d065
      include d066
      include d069
      include f349
      include f350
      include f351
      include f352
      include f353
      include f354
      include f355
      include f356
      include f357
      include f358
      include f359
      include f360
      include f361
      include f362
      include f363
      include f364
      autolayout tb
      title "Root project files and folders"
      description "Перший рівень проекту: головні папки, конфіги, lockfiles, документація і локальні службові файли."
    }
    component codebase "App_Router_File_Map" {
      include d005
      include d006
      include d007
      include d008
      include d009
      include d010
      include d011
      include d012
      include d013
      include d014
      include d015
      include d016
      include d017
      include d018
      include d019
      include d020
      include d021
      include d022
      include d023
      include d024
      include d025
      include d026
      include d027
      include d028
      include d029
      include d030
      include d031
      include f072
      include f073
      include f074
      include f075
      include f076
      include f077
      include f078
      include f079
      include f080
      include f081
      include f082
      include f083
      include f084
      include f085
      include f086
      include f087
      include f088
      include f089
      include f090
      include f091
      include f092
      include f093
      include f094
      include f095
      include f096
      include f097
      include f098
      include f099
      include f100
      include f101
      include f102
      include f103
      include f104
      include f105
      include f106
      include f107
      include f108
      autolayout tb
      title "app directory file structure"
      description "Повне вкладення Next.js App Router: маршрути, layouts, loading states і сторінки dashboard."
    }
    component codebase "Components_File_Map" {
      include d033
      include d034
      include d035
      include d036
      include d037
      include d038
      include d039
      include d040
      include d041
      include d042
      include d043
      include d044
      include d045
      include d046
      include d047
      include d048
      include d049
      include d050
      include f110
      include f111
      include f112
      include f113
      include f114
      include f115
      include f116
      include f117
      include f118
      include f119
      include f120
      include f121
      include f122
      include f123
      include f124
      include f125
      include f126
      include f127
      include f128
      include f129
      include f130
      include f131
      include f132
      include f133
      include f134
      include f135
      include f136
      include f137
      include f138
      include f139
      include f140
      include f141
      include f142
      include f143
      include f144
      include f145
      include f146
      include f147
      include f148
      include f149
      include f150
      include f151
      include f152
      include f153
      include f154
      include f155
      include f156
      include f157
      include f158
      include f159
      include f160
      include f161
      include f162
      include f163
      include f164
      include f165
      include f166
      include f167
      include f168
      include f169
      include f170
      include f171
      include f172
      include f173
      include f174
      include f175
      include f176
      include f177
      include f178
      include f179
      include f180
      include f181
      include f182
      include f183
      include f184
      include f185
      include f186
      include f187
      include f188
      include f189
      include f190
      include f191
      include f192
      include f193
      include f194
      include f195
      include f196
      include f197
      include f198
      include f199
      include f200
      include f201
      include f202
      include f203
      include f204
      include f205
      include f206
      include f207
      include f208
      include f209
      include f210
      include f211
      include f212
      include f213
      include f214
      include f215
      include f216
      include f217
      include f218
      include f219
      include f220
      include f221
      include f222
      include f223
      include f224
      include f225
      include f226
      include f227
      include f228
      include f229
      include f230
      autolayout tb
      title "components directory file structure"
      description "Повне вкладення React components: domain components, dashboards, reservation flows і UI primitives."
    }
    component codebase "Lib_Hooks_File_Map" {
      include d054
      include d055
      include d056
      include d057
      include d058
      include d059
      include d060
      include d061
      include f235
      include f236
      include f237
      include f238
      include f239
      include f240
      include f241
      include f242
      include f243
      include f244
      include f245
      include f246
      include f247
      include f248
      include f249
      include f250
      include f251
      include f252
      include f253
      include f254
      include f255
      include f256
      include f257
      include f258
      include f259
      include f260
      include f261
      include f262
      include f263
      autolayout tb
      title "lib and hooks file structure"
      description "Бізнес-логіка, Supabase helpers, rules, formatting, localization, room rack logic і reusable hooks."
    }
    component codebase "Database_Scripts_File_Map" {
      include d063
      include d064
      include d066
      include d067
      include d068
      include f267
      include f268
      include f269
      include f270
      include f271
      include f272
      include f273
      include f274
      include f275
      include f276
      include f277
      include f278
      include f279
      include f280
      include f281
      include f282
      include f283
      include f284
      include f285
      include f286
      include f287
      include f288
      include f289
      include f290
      include f291
      include f292
      include f293
      include f294
      include f295
      include f296
      include f297
      include f298
      include f299
      include f300
      include f301
      include f302
      include f303
      include f304
      include f305
      include f306
      include f307
      include f308
      include f309
      include f310
      include f311
      include f312
      include f313
      include f315
      include f316
      include f317
      include f318
      include f319
      include f320
      include f321
      include f322
      include f323
      include f324
      include f325
      include f326
      include f327
      autolayout tb
      title "database scripts and Supabase migrations"
      description "SQL scripts, legacy repair/backfill files, Supabase config and versioned migrations."
    }
    component codebase "Tests_Docs_File_Map" {
      include d051
      include d052
      include d053
      include d069
      include d070
      include f231
      include f232
      include f233
      include f234
      include f328
      include f329
      include f330
      include f331
      include f332
      include f333
      include f334
      include f335
      include f336
      include f337
      include f338
      include f339
      include f340
      include f341
      include f342
      include f343
      include f344
      include f345
      include f346
      include f347
      include f348
      include f353
      autolayout tb
      title "tests and documentation file structure"
      description "Vitest tests, fixtures, architecture docs, Structurizr DSL workspaces and generated markdown."
    }
    component codebase "CheckIn_Render_And_Imports" {
      include f084
      include f128
      include f157
      include f169
      include f172
      include f175
      include f177
      include f180
      include f193
      include f196
      include f202
      include f205
      include f206
      include f216
      include f256
      include f254
      include f258
      include f259
      include f252
      include f251
      include f253
      include f250
      include f260
      include f241
      include f261
      include rbHeader
      include rbExpiredActions
      include rbDetails
      include rbCheckIn
      include rbAssignedRoom
      include rbRoomPicker
      include rbEarly
      include rbPayment
      include rbNotes
      include rbBlockers
      include rbSubmit
      include rbSupabaseRead
      include rbSupabaseWrite
      include rbRouter
      include supabase
      include lucide
      include nextRuntime
      autolayout lr
      title "Check-in page render tree and dependencies"
      description "Route /dashboard/front-desk/check-in/{id}: server reads, CheckInForm render blocks, UI primitives, business rules and client writes."
    }
    dynamic codebase "CheckIn_Submit_Flow" {
      f128 -> rbSubmit "Operator clicks confirm"
      rbSubmit -> rbSupabaseWrite "handleCheckIn validates fresh room, writes reservation room, payment and reservation status"
      rbSupabaseWrite -> supabase "mutations"
      rbSubmit -> rbRouter "push + refresh"
      autolayout lr
      title "Check-in submit flow"
    }
    styles {
      element "Person" { shape Person background "#334155" color "#ffffff" }
      element "Software System" { background "#2563eb" color "#ffffff" }
      element "External" { background "#6b7280" color "#ffffff" }
      element "Container" { background "#0f766e" color "#ffffff" }
      element "Folder" { shape Folder background "#f8fafc" color "#0f172a" stroke "#94a3b8" }
      element "File" { shape Component background "#ffffff" color "#111827" stroke "#64748b" }
      element "RenderBlock" { shape RoundedBox background "#fff7ed" color "#7c2d12" stroke "#fb923c" }
    }
  }
}
