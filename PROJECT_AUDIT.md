# MoveBoss Pro - Complete Project Audit

**Generated:** $(date)
**Project Type:** Monorepo (Turborepo)
**Apps:** Web (Next.js) + Mobile (React Native/Expo)

---

## 📁 ROOT STRUCTURE

```
moveboss-pro/
├── apps/
│   ├── mobile/          # React Native/Expo mobile app (driver/helper)
│   └── web/             # Next.js web app (admin/owner/broker dashboard)
├── packages/            # Shared packages (currently empty)
├── supabase/
│   └── migrations/      # Database migrations (78 files)
├── node_modules/
├── package.json         # Root workspace config
├── package-lock.json
├── turbo.json           # Turborepo config
└── README.md
```

---

## 🌐 WEB APP (`apps/web/`)

### Root Files
```
apps/web/
├── components.json      # shadcn/ui config
├── eslint.config.mjs
├── next.config.ts
├── next-env.d.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── tsconfig.tsbuildinfo
```

### Public Assets (`public/`)
```
public/
├── file.svg
├── globe.svg
├── next.svg
├── vercel.svg
└── window.svg
```

### Source Code (`src/`)

#### 🗂️ App Routes (`src/app/`)

**Route Groups:**
- `(app)/` - Main authenticated app routes
- `(auth)/` - Authentication routes
- `(company)/` - Company portal routes
- `(driver)/` - Driver portal routes

**Main Routes:**
```
src/app/
├── layout.tsx                    # Root layout
├── page.tsx                      # Home/landing (redirects)
├── globals.css                   # Global styles
├── favicon.ico
├── middleware.ts                 # Auth & route protection
│
├── (app)/                        # Main Dashboard Routes
│   ├── layout.tsx                # Dashboard layout wrapper
│   │
│   ├── dashboard/                # Main dashboard area
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard home
│   │   │
│   │   ├── activity/
│   │   │   └── page.tsx          # Activity log
│   │   │
│   │   ├── assigned-loads/       # Loads assigned to carrier
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── confirm/
│   │   │           └── page.tsx
│   │   │
│   │   ├── carrier-requests/     # Carrier partnership requests
│   │   │   ├── page.tsx
│   │   │   └── request-actions.tsx
│   │   │
│   │   ├── companies/            # Company management
│   │   │   ├── page.tsx
│   │   │   ├── company-list-filters.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── delete-company-button.tsx
│   │   │       └── ledger/
│   │   │           └── page.tsx
│   │   │
│   │   ├── compliance/           # Compliance & documents
│   │   │   ├── page.tsx
│   │   │   ├── alerts/
│   │   │   │   └── page.tsx
│   │   │   ├── upload/
│   │   │   │   ├── page.tsx
│   │   │   │   └── upload-form.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── upload/
│   │   │           └── page.tsx
│   │   │
│   │   ├── drivers/              # Driver management
│   │   │   ├── page.tsx
│   │   │   ├── driver-list-filters.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── delete-driver-button.tsx
│   │   │
│   │   ├── expenses/             # Expense tracking
│   │   │   └── page.tsx
│   │   │
│   │   ├── finance/              # Financial management
│   │   │   ├── page.tsx
│   │   │   ├── expenses/
│   │   │   │   └── page.tsx
│   │   │   ├── receivables/
│   │   │   │   └── page.tsx
│   │   │   ├── reports/
│   │   │   │   └── page.tsx
│   │   │   └── settlements/
│   │   │       └── page.tsx
│   │   │
│   │   ├── fleet/                # Fleet management
│   │   │   ├── page.tsx
│   │   │   ├── trucks/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   └── trailers/
│   │   │       ├── page.tsx
│   │   │       ├── new/
│   │   │       │   └── page.tsx
│   │   │       └── [id]/
│   │   │           ├── page.tsx
│   │   │           └── edit/
│   │   │               └── page.tsx
│   │   │
│   │   ├── live-fleet/           # Real-time fleet tracking
│   │   │   ├── page.tsx
│   │   │   └── live-fleet-filters.tsx
│   │   │
│   │   ├── load-board/           # Public load board
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── loads/                # Load management
│   │   │   ├── page.tsx
│   │   │   ├── load-list-filters.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── load-actions.tsx
│   │   │       └── edit/
│   │   │           └── page.tsx
│   │   │
│   │   ├── loads-given-out/      # Loads given to other carriers
│   │   │   └── page.tsx
│   │   │
│   │   ├── marketplace-loads/    # Marketplace load browsing
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── my-requests/          # User's load requests
│   │   │   └── page.tsx
│   │   │
│   │   ├── notifications/        # Notifications center
│   │   │   └── page.tsx
│   │   │
│   │   ├── operations/           # Operations dashboard
│   │   │   └── page.tsx
│   │   │
│   │   ├── partnerships/         # Partnership management
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── people/               # People management hub
│   │   │   ├── page.tsx
│   │   │   ├── drivers/
│   │   │   │   └── page.tsx
│   │   │   └── helpers/
│   │   │       └── page.tsx
│   │   │
│   │   ├── post-load/            # Post load to marketplace
│   │   │   └── page.tsx
│   │   │
│   │   ├── post-pickup/          # Post-pickup workflow
│   │   │   └── page.tsx
│   │   │
│   │   ├── posted-jobs/          # Posted jobs management
│   │   │   ├── page.tsx
│   │   │   ├── JobCard.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── receivables/          # Accounts receivable
│   │   │   └── page.tsx
│   │   │
│   │   ├── reports/              # Reporting & analytics
│   │   │   ├── page.tsx
│   │   │   ├── compliance/
│   │   │   │   ├── page.tsx
│   │   │   │   └── compliance-export.tsx
│   │   │   ├── drivers/
│   │   │   │   ├── page.tsx
│   │   │   │   └── drivers-export.tsx
│   │   │   ├── marketplace/
│   │   │   │   └── page.tsx
│   │   │   ├── profit/
│   │   │   │   └── page.tsx
│   │   │   ├── profitability/
│   │   │   │   ├── page.tsx
│   │   │   │   └── profitability-export.tsx
│   │   │   └── revenue/
│   │   │       ├── page.tsx
│   │   │       └── revenue-export.tsx
│   │   │
│   │   ├── settings/              # Settings & configuration
│   │   │   ├── page.tsx
│   │   │   ├── account/
│   │   │   │   ├── page.tsx
│   │   │   │   └── account-form.tsx
│   │   │   ├── company-profile/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── actions.ts
│   │   │   │   ├── CompanyProfileFormClient.tsx
│   │   │   │   └── DOTVerificationCard.tsx
│   │   │   ├── notifications/
│   │   │   │   └── page.tsx
│   │   │   ├── roles/
│   │   │   │   └── page.tsx
│   │   │   └── team/
│   │   │       ├── page.tsx
│   │   │       ├── actions.ts
│   │   │       ├── TeamPageClient.tsx
│   │   │       ├── InviteMemberModal.tsx
│   │   │       └── EditPermissionsModal.tsx
│   │   │
│   │   ├── settlements/          # Settlement management
│   │   │   └── page.tsx
│   │   │
│   │   ├── statements/           # Financial statements
│   │   │   ├── companies/
│   │   │   │   └── page.tsx
│   │   │   └── drivers/
│   │   │       └── page.tsx
│   │   │
│   │   ├── storage/              # Storage location management
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   ├── page.tsx
│   │   │   │   └── _components/
│   │   │   │       └── storage-location-form.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── edit/
│   │   │       │   └── page.tsx
│   │   │       └── _components/
│   │   │           └── payment-actions.tsx
│   │   │
│   │   └── trips/                # Trip management
│   │       ├── page.tsx
│   │       ├── trip-list-filters.tsx
│   │       ├── new/
│   │       │   └── page.tsx
│   │       └── [id]/
│   │           ├── page.tsx
│   │           ├── actions.ts
│   │           ├── CloseTripButton.tsx
│   │           ├── delete-trip-button.tsx
│   │           ├── TripDetailClient.tsx
│   │           └── settlement/
│   │               └── page.tsx
│   │
│   ├── invitation/               # Partnership invitation acceptance
│   │   └── [token]/
│   │       ├── page.tsx
│   │       ├── actions.ts
│   │       └── AcceptPartnershipClient.tsx
│   │
│   ├── invite/                   # Team member invitation
│   │   └── [token]/
│   │       ├── page.tsx
│   │       └── AcceptInviteClient.tsx
│   │
│   ├── onboarding/               # User onboarding flow
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── actions.ts
│   │   ├── role-selection.tsx
│   │   ├── WorkspaceEscape.tsx
│   │   ├── workspace/
│   │   │   └── page.tsx
│   │   ├── carrier/
│   │   │   ├── page.tsx
│   │   │   └── carrier-setup.tsx
│   │   ├── company/
│   │   │   ├── page.tsx
│   │   │   └── company-setup.tsx
│   │   ├── driver/
│   │   │   ├── page.tsx
│   │   │   └── driver-setup.tsx
│   │   └── owner_operator/
│   │       ├── page.tsx
│   │       └── owner-operator-setup.tsx
│   │
│   └── sign-out-button.tsx
│
├── (auth)/                       # Authentication Routes
│   ├── layout.tsx
│   ├── login/
│   │   ├── page.tsx
│   │   ├── login-form.tsx
│   │   ├── login.module.css
│   │   └── route-lines.tsx
│   ├── signup/
│   │   ├── page.tsx
│   │   └── signup-form.tsx
│   ├── forgot-password/
│   │   ├── page.tsx
│   │   └── forgot-password-form.tsx
│   └── reset-password/
│       ├── page.tsx
│       └── reset-password-form.tsx
│
├── (company)/                    # Company Portal Routes
│   ├── layout.tsx
│   └── company/
│       ├── dashboard/
│       │   └── page.tsx
│       ├── loads/
│       │   ├── page.tsx
│       │   ├── new/
│       │   │   └── page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       └── requests/
│       │           └── page.tsx
│       ├── carriers/
│       │   ├── page.tsx
│       │   └── [id]/
│       │       └── compliance/
│       │           └── page.tsx
│       ├── notifications/
│       │   └── page.tsx
│       └── requests/
│           └── page.tsx
│
├── (driver)/                     # Driver Portal Routes
│   └── driver/
│       ├── layout.tsx
│       ├── page.tsx
│       └── trips/
│           ├── page.tsx
│           └── [id]/
│               └── page.tsx
│
├── api/                          # API Routes (Next.js API)
│   ├── companies/
│   │   └── check-dot/
│   │       └── route.ts
│   ├── compliance-documents/
│   │   └── route.ts
│   ├── debug/
│   │   └── company-mode/
│   │       └── route.ts
│   ├── debug-insert-driver/
│   │   └── route.ts
│   ├── driver/
│   │   └── me/
│   │       └── route.ts
│   ├── driver-location/
│   │   ├── nearby/
│   │   │   └── route.ts
│   │   └── ping/
│   │       └── route.ts
│   ├── fleet/
│   │   └── status/
│   │       └── route.ts
│   ├── fmcsa/
│   │   ├── search/
│   │   │   └── route.ts
│   │   └── verify/
│   │       └── route.ts
│   ├── marketplace/
│   │   └── load/
│   │       └── route.ts
│   ├── notifications/
│   │   ├── driver-action/
│   │   │   └── route.ts
│   │   └── send/
│   │       └── route.ts
│   ├── ocr/
│   │   ├── bill-of-lading/
│   │   │   └── route.ts
│   │   └── loading-report/
│   │       └── route.ts
│   ├── setup-progress/
│   │   └── route.ts
│   ├── test-marketplace/
│   │   └── route.ts
│   ├── trips/
│   │   └── [id]/
│   │       ├── estimated-miles/
│   │       │   └── route.ts
│   │       └── suggestions/
│   │           └── route.ts
│   ├── upload/
│   │   └── route.ts
│   └── zip-lookup/
│       └── route.ts
│
├── auth/
│   └── callback/
│       └── route.ts              # Supabase auth callback
│
├── company-login/
│   └── page.tsx                  # Company login page
│
├── driver/
│   ├── app/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   └── home/
│       └── page.tsx
│
├── driver-login/
│   └── page.tsx                  # Driver login page
│
├── test/                         # Test routes
├── test-driver-insert/
│   └── page.tsx
└── page.tsx                      # Root page (redirects)
```

#### 🧩 Components (`src/components/`)

**UI Components (shadcn/ui):**
```
src/components/ui/
├── address-fields.tsx
├── alert-dialog.tsx
├── alert.tsx
├── avatar.tsx
├── badge.tsx
├── button.tsx
├── calendar.tsx
├── card.tsx
├── checkbox.tsx
├── date-picker.tsx
├── dialog.tsx
├── dropdown-menu.tsx
├── input.tsx
├── label.tsx
├── multi-photo-field.tsx
├── photo-field.tsx
├── popover.tsx
├── progress.tsx
├── radio-group.tsx
├── scroll-area.tsx
├── select.tsx
├── separator.tsx
├── sheet.tsx
├── stepper.tsx
├── switch.tsx
├── table.tsx
├── tabs.tsx
├── textarea.tsx
├── toast.tsx
├── toaster.tsx
└── tooltip.tsx
```

**Feature Components:**
```
src/components/
├── access-denied.tsx
├── company-notification-bell.tsx
├── compliance-status-widget.tsx
├── compliance-warning.tsx
├── export-button.tsx
├── load-request-actions.tsx
├── logout-button.tsx
├── notification-bell.tsx
├── photo-gallery.tsx
├── photo-upload.tsx
├── rating-form.tsx
├── rating-stars.tsx
├── reliability-badge.tsx
├── setup-checklist.tsx
├── theme-provider.tsx
├── theme-toggle.tsx
├── trip-assignment-form.tsx
├── verification-badge.tsx
└── verification-status-widget.tsx
```

**Domain-Specific Components:**
```
src/components/
├── companies/
│   ├── CompanyForm.tsx
│   └── CompanyFormMVP.tsx
│
├── dashboard/
│   ├── CompanyTable.tsx
│   ├── MetricsCard.tsx
│   ├── QuickActions.tsx
│   ├── StatCard.tsx
│   ├── StatRow.tsx
│   ├── TodaysFocus.tsx
│   └── v3/
│       ├── CriticalAlertBar.tsx
│       ├── DriversNow.tsx
│       ├── KeyMetrics.tsx
│       └── WhoOwesYou.tsx
│
├── driver/
│   ├── driver-expense-form.tsx
│   ├── driver-header.tsx
│   ├── driver-load-forms.tsx
│   ├── driver-load-workflow-cards.tsx
│   ├── driver-quick-actions.tsx
│   ├── driver-settlement-card.tsx
│   ├── driver-trip-forms.tsx
│   ├── pre-delivery-check-card.tsx
│   ├── trip-completed-card.tsx
│   ├── trip-completion-card.tsx
│   └── trip-header-compact.tsx
│
├── drivers/
│   └── DriverForm.tsx
│
├── fleet/
│   ├── status-actions.tsx
│   ├── TrailerForm.tsx
│   └── TruckForm.tsx
│
├── layout/
│   ├── CreationPageShell.tsx
│   ├── dashboard-shell.tsx
│   ├── mobile-nav.tsx
│   ├── sidebar.tsx
│   ├── top-nav.tsx
│   └── WorkspaceContext.tsx
│
├── loads/
│   ├── LoadCreateForm.tsx
│   ├── LoadForm.tsx
│   ├── LoadPhotos.tsx
│   └── LoadRequestForm.tsx
│
├── marketplace/
│   └── marketplace-actions.tsx
│
└── partnerships/
    └── PartnershipForm.tsx
```

#### 🪝 Hooks (`src/hooks/`)

```
src/hooks/
├── use-export.ts              # Export functionality hook
├── use-setup-progress.ts       # Onboarding progress tracking
├── use-toast.ts                # Toast notifications
├── useNotifications.ts         # Notification management
└── useZipLookup.ts             # ZIP code lookup
```

#### 📊 Data Layer (`src/data/`)

**Data Access Functions (Supabase queries):**
```
src/data/
├── activity-log.ts             # Activity log queries
├── cancellations.ts            # Cancellation tracking
├── companies.ts                # Company CRUD operations
├── company-ledger.ts           # Company financial ledger
├── company-portal.ts           # Company portal data
├── compliance-alerts.ts        # Compliance alert queries
├── compliance-documents.ts     # Compliance document queries
├── compliance.ts               # General compliance data
├── domain-types.ts             # Domain type definitions
├── driver-shared.ts            # Shared driver utilities
├── driver-workflow.ts          # Driver workflow state
├── drivers.ts                  # Driver CRUD operations
├── expenses.ts                 # Expense queries
├── fleet.ts                    # Fleet management queries
├── load-financials.ts          # Load financial calculations
├── load-photos.ts              # Load photo management
├── load-status.ts              # Load status tracking
├── loads.ts                    # Load CRUD operations
├── location.ts                 # Location/geocoding utilities
├── marketplace.ts              # Marketplace queries
├── notifications.ts            # Notification queries
├── onboarding.ts               # Onboarding data
├── partnerships.ts             # Partnership queries
├── profiles.ts                 # User profile queries
├── ratings.ts                  # Rating system queries
├── reports.ts                  # Report generation
├── settlements.ts              # Settlement queries
├── setup-progress.ts           # Setup progress tracking
├── storage-locations.ts        # Storage location queries
├── trip-financials.ts          # Trip financial calculations
├── trips.ts                    # Trip CRUD operations
└── verification.ts             # Verification queries
```

#### 🛠️ Utilities & Services (`src/lib/`)

**Core Utilities:**
```
src/lib/
├── capabilities.ts             # Feature capability checks
├── dashboardFocusItems.ts      # Dashboard focus items config
├── dashboardMode.ts            # Dashboard mode utilities
├── form-data.ts                # Form data utilities
├── geocoding.ts                # Geocoding services
├── load-financial-utils.ts     # Load financial calculations
├── permissions.ts              # Permission checking
├── push-notifications.ts       # Push notification service
├── types.ts                    # Shared TypeScript types
├── utils.ts                    # General utilities
└── vehicle-types.ts            # Vehicle type definitions
```

**Database:**
```
src/lib/db/
└── companies.ts                # Company DB utilities
```

**Email Service:**
```
src/lib/email/
├── client.ts                   # Email client setup
├── config.ts                   # Email configuration
├── notifications.ts            # Notification emails
└── templates/
    ├── base.ts                 # Base email template
    ├── compliance.ts           # Compliance email templates
    ├── driver-assignment.ts    # Driver assignment emails
    ├── load-status.ts          # Load status emails
    ├── marketplace.ts          # Marketplace emails
    └── partnership-invitation.ts
```

**Export Services:**
```
src/lib/export/
├── csv.ts                      # CSV export utilities
└── pdf.ts                      # PDF export utilities
```

**Supabase Clients:**
```
src/lib/
├── supabase-admin.ts           # Admin Supabase client
├── supabase-client.ts          # Client-side Supabase client
├── supabase-server.ts          # Server-side Supabase client
└── supabaseClient.ts           # Legacy Supabase client
```

**Validation:**
```
src/lib/validation/
└── companyProfileSchema.ts    # Company profile validation schema

src/lib/validators/
├── account.ts                  # Account validation
└── companyProfile.ts          # Company profile validation
```

**External Services:**
```
src/lib/
└── fmcsa.ts                    # FMCSA verification service
```

---

## 📱 MOBILE APP (`apps/mobile/`)

### Root Files
```
apps/mobile/
├── app.json                    # Expo config
├── eas.json                    # EAS Build config
├── google-services.json        # Firebase config
├── metro.config.js            # Metro bundler config
├── package.json
├── tsconfig.json
└── README.md (implied)
```

### Assets (`assets/`)
```
assets/
├── adaptive-icon.png
├── favicon.png
├── icon.png
├── notification-icon.png
└── splash-icon.png
```

### Source Code

#### 🗂️ App Routes (`app/`)
```
app/
├── _layout.tsx                 # Root layout
│
├── (app)/                      # Authenticated app routes
│   ├── _layout.tsx
│   ├── index.tsx               # Home/dashboard
│   ├── documents.tsx           # Document management
│   ├── earnings.tsx            # Earnings view
│   └── trips/
│       ├── index.tsx           # Trip list
│       ├── [id].tsx            # Trip detail
│       └── [id]/
│           ├── expenses.tsx    # Trip expenses
│           └── loads/
│               ├── [loadId].tsx
│               └── [loadId]/
│                   ├── collect-payment.tsx
│                   ├── contract-details.tsx
│                   └── pickup-completion.tsx
│
└── (auth)/                     # Authentication routes
    ├── _layout.tsx
    ├── login.tsx
    ├── forgot-password.tsx
    └── reset-password.tsx
```

#### 🧩 Components (`components/`)
```
components/
├── DamageDocumentation.tsx     # Damage documentation UI
├── StatusBadge.tsx             # Status badge component
└── TripCard.tsx                # Trip card component
```

#### 🪝 Hooks (`hooks/`)
```
hooks/
├── useDriverEarnings.ts        # Driver earnings data
├── useDriverProfile.ts         # Driver profile data
├── useDriverTrips.ts           # Driver trips data
├── useExpenseActions.ts        # Expense actions
├── useImageUpload.ts           # Image upload functionality
├── useLoadActions.ts           # Load actions
├── useLoadDetail.ts            # Load detail data
├── useLoadDocuments.ts         # Load document management
├── usePushNotifications.ts     # Push notification handling
├── useTripActions.ts           # Trip actions
└── useVehicleDocuments.ts      # Vehicle document management
```

#### 🛠️ Utilities (`lib/`)
```
lib/
├── notify-owner.ts            # Owner notification service
└── supabase.ts                 # Supabase client setup
```

#### 🔄 Providers (`providers/`)
```
providers/
├── AuthProvider.tsx            # Authentication context
└── NotificationProvider.tsx    # Notification context
```

#### 📝 Types (`types/`)
```
types/
└── index.ts                    # TypeScript type definitions
```

#### 📚 Documentation (`docs/`)
```
docs/
└── PUSH_NOTIFICATIONS_SETUP.md # Push notification setup guide
```

---

## 🗄️ DATABASE (`supabase/migrations/`)

**78 Migration Files** (chronological order):

### Foundation Migrations
- `202411210001_trips_module.sql`
- `202411210002_driver_locations.sql`
- `202411210003_drivers_fleet_module.sql`
- `202411220001_loads_module_update.sql`
- `202411230001_upgrade_companies_drivers_fleet.sql`
- `202411240001_add_vehicle_type_to_trucks.sql`
- `202411250001_add_company_addresses.sql`

### Auth & Profiles
- `202412010001_access_and_driver_extensions.sql`
- `202412020001_create_profiles.sql`
- `202412020002_company_profile_extensions.sql`
- `202412020003_company_profile_fields.sql`
- `202412020004_company_memberships.sql`
- `202412020005_company_memberships_full.sql`

### Loads & Trips
- `202412030001_loads_load_types_and_job_numbers.sql`
- `202412290001_trip_settlements.sql`
- `202412290002_trip_odometer_and_contracts.sql`

### Workspace & Companies
- `202412240001_workspace_company_flag.sql`
- `202412240002_companies_rls_workspace.sql`
- `202412240010_workspace_owner_contact.sql`

### Driver Features
- `202412300001_add_login_method_to_drivers.sql`
- `202412300002_ensure_driver_login_columns.sql`
- `20251125001_trust_level_and_delivery_flow.sql`
- `20251126001_driver_load_workflow.sql`
- `20251126002_load_delivery_workflow.sql`
- `20251126003_loading_photos.sql`
- `20251126004_trip_completion.sql`
- `20251126005_settlement_payment_tracking.sql`

### Platform Foundation
- `20251126006_activity_log.sql`
- `20251126007_comprehensive_platform_foundation.sql`
- `20251126008_company_portal_access.sql`

### Load Features
- `20251127001_load_rate_fields.sql`
- `20251127002_marketplace_location_fields.sql`
- `20251127003_trip_driver_sharing.sql`
- `20251127004_notifications_and_cancellations.sql`
- `20251127005_load_status_history.sql`

### Ratings & Compliance
- `20251127006_ratings.sql`
- `20251127007_compliance_documents.sql`
- `20251127008_compliance_alerts.sql`
- `20251127009_photo_proof.sql`

### Email & Onboarding
- `20251127010_email_preferences.sql`
- `20251127011_onboarding.sql`
- `20251127012_add_email_to_profiles.sql`

### Marketplace & Load Board
- `20251128001_load_posting_support.sql`
- `20251128002_fix_company_type_constraint.sql`
- `20251128003_user_permissions.sql`
- `20251128004_load_board_enhancements.sql`
- `20251128005_marketplace_trip_integration.sql`

### Storage & Fleet
- `20251128006_storage_locations.sql`
- `20251128007_truck_requirement.sql`
- `20251128008_share_origin_address.sql`
- `20251128009_internal_reference.sql`

### FMCSA & Verification
- `20251128010_fmcsa_verification.sql`
- `20251128020_fmcsa_unique_dot_hhg.sql`

### Storage & Payments
- `20251128021_storage_payment_tracking.sql`
- `20251128022_storage_buckets.sql`

### Push Notifications
- `20251128023_push_tokens.sql`
- `20251128024_driver_mobile_rls.sql`

### Load Management
- `20251129001_trip_reference_number.sql`
- `20251129002_global_load_numbering.sql`
- `20251129003_load_release_tracking.sql`
- `20251129004_soft_delete_status.sql`
- `20251129005_load_source_contract_details.sql`

### Pickup & Damage
- `20251130001_pickup_fields.sql`
- `20251130002_pre_existing_damages.sql`
- `20251130003_vehicle_documents.sql`
- `20251130004_setup_progress.sql`
- `20251130005_fix_workspace_company_flag.sql`

### Partnerships & Marketplace Fixes
- `20251201001_fix_partnership_unique_constraint.sql`
- `20251201002_marketplace_display_columns.sql`
- `20251201003_marketplace_rls_policy.sql`
- `20251201004_fix_companies_driver_policy.sql`
- `20251201006_companies_marketplace_visibility.sql`
- `20251201007_fix_loads_marketplace_rls.sql`
- `20251201008_companies_carrier_requests_policy.sql`
- `20251201009_fix_companies_carrier_requests_policy.sql`
- `20251201010_loads_carrier_update_policy.sql`
- `20251201011_fix_loads_select_policy.sql`
- `20251201012_fix_loads_marketplace_rls.sql`

---

## 📊 STATISTICS

### Web App
- **Total Routes:** ~150+ pages
- **Components:** 80+ components
- **Hooks:** 5 hooks
- **Data Functions:** 30+ data access files
- **Utilities:** 20+ utility files
- **API Routes:** 21 API endpoints

### Mobile App
- **Screens:** 10+ screens
- **Components:** 3 components
- **Hooks:** 11 hooks
- **Providers:** 2 providers

### Database
- **Migrations:** 78 migration files
- **Schema Evolution:** From Nov 2024 to Dec 2024

---

## 🏗️ ARCHITECTURE SUMMARY

### Tech Stack
- **Web:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Mobile:** React Native/Expo, TypeScript
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **Monorepo:** Turborepo

### Key Patterns
- **Route Groups:** Organized by user type `(app)`, `(auth)`, `(company)`, `(driver)`
- **Data Layer:** Separated data access functions in `src/data/`
- **Component Organization:** UI components vs feature components
- **Server Actions:** Used for mutations (actions.ts files in routes)
- **API Routes:** Used for external integrations and webhooks

### Notable Features
- Multi-tenant architecture (company-based)
- Role-based access control (owner, carrier, driver, broker)
- Marketplace for load posting/browsing
- Compliance document management
- Financial tracking (settlements, receivables, expenses)
- Real-time fleet tracking
- Driver mobile app integration
- Partnership/invitation system
- Onboarding flows for different user types

---

**End of Audit**

