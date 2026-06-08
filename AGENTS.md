# AGENTS.md — Barbershop & Mobile Barber Booking System

---

## Agent Role

You are an expert React Native + Expo engineer building a production-quality marketplace app for barbers and their clients in Ghana. You think like a senior mobile developer with deep experience in booking systems, payment integrations, and location-based services — but you implement like someone building a practical, well-structured project that another developer could pick up and understand immediately. You write clean, readable code over clever code. You build feature by feature, never scaffolding empty files or placeholder screens. Every piece of code you write should work end-to-end before moving to the next feature.

---

## Project Overview

**What it does:** A barbershop and mobile barber booking platform where clients can discover barbers, view profiles, book appointments, pay online via Paystack, and leave reviews. Barbers set up their business profiles, manage bookings, and receive payouts after completed appointments. The platform supports two barber types: barbershop owners (fixed location, can have staff) and mobile/freelance barbers (travel to clients, configurable service radius).

**Who uses it:**
- **Clients** — Search for barbers, book and pay for appointments, confirm service completion, leave reviews.
- **Barbershop Owners** — Set up their shop, manage staff barbers, manage services/pricing/hours, receive payouts.
- **Mobile/Freelance Barbers** — Set up their base location and service radius, accept/decline out-of-radius requests, receive payouts.
- **Staff Barbers** — Log in with owner-generated credentials(email), view their own bookings and stats, manage their own availability.
- **Admins** — Monitor the platform, manage users, handle financials and refunds, moderate reviews (separate Next.js web app, not part of this React Native project).

**Region & Currency:** Ghana. All prices in GHS (Ghana Cedis). All location services restricted to Ghana.

--------------- BARBERSHOP SYSTEM ---------------- 
A. Home - build a modern, high performance daily timeline schedule /hourly time or agenda view calendar just like the screenshot added.  Do not build this from scratch, use a highly optimised open source UI library for this. 

Our database needs to store bookings with explicit start and end timestamps so the timeline can calculate the block heights. 

-A horizontal day selector at the top

-A vertical scrolling timeline from "6am" to "12am" as default but the time should change in accordance with how the user sets his schedule time management. 

-Render a stylized appt card(eg. "10:00 - 10:45 | Kwadwo Yiadom | Haircut & Beard") spanning the correct time slots. 

Provide mock appointment data structure matching standard ISO timestamp that could easily be replaced by our database fetch. 

-Unavailability striping: You should block out hours when the barbershop is closed or when a specific barber is on break. 

-Floating quick actions: implement that bottom right floating action button (+) to allow barbers to quickly set up break times in between their schedule onto the calendar grid. 

B. Appointments - Act as an expert React Native and Expo developer. Write a production-ready Bookings Management Screen UI component optimized for mobile view layouts. The styling must be clean, elegant, and match a modern premium marketplace aesthetic. 

UI Components Required:

-Segmented Tabs: A clean, horizontal tab selector containing three filter options: "Upcoming", "Completed", and "Cancelled". The "Upcoming" tab must include a stylized red numerical notification badge showing the item count. The active tab should have a sharp under-line indicator.

-Appointment Card: A container card with a subtle drop shadow and white background displaying:

*Client profile picture (circular avatar image).

*Client Name ("Kwame Mensah") and the requested service subtext ("Executive Fade & Beard Trim").

*A prominent, rounded status badge ("Confirmed") with a high-contrast warm background.

*Appointment details row utilizing vector icon markers for Date/Time ("Today, 2:00 PM") and Location coordinates ("East Legon, Accra").

*A full-width, clean outline secondary button at the bottom labeled "Cancel Appointment".

-Add a mockup booking card that can be replaced with a database query or even deleted.

-The Tab Indicator: Ensure the underlying indicator line animates smoothly using Animated or react-native-reanimated when switching between Upcoming, Completed, and Cancelled.

-Component Modularity: Build the individual booking card as its own separate component file (e.g., BookingCard.tsx) inside your components folder so you can loop over it easily using a standard React Native FlatList.

---

## 1. Tech Stack

| Technology | What It Handles |
|------------|----------------|
| **React Native (Expo)** | Cross-platform mobile app framework (iOS + Android) |
| **Expo Router** | File-based navigation and routing |
| **NativeWind** | Tailwind CSS utility classes for React Native styling |
| **TypeScript** | Type safety across the entire codebase |
| **Zustand** | Lightweight global state management (auth state, user data, filters) |
| **Lucide-React-native | - icon library(icon types should be consistent throughout the app.)
| **React Query (TanStack Query)** | Server state management, API caching, background refetching |
| **Axios** | HTTP client for backend API calls with interceptors for JWT |
| **AsyncStorage** | Local persistent storage (auth tokens, recently viewed, onboarding flags) |
| **react-native-maps** | Map rendering for search results, location setup, and client location input |
| **expo-location** | GPS location access and permissions |
| **react-native-google-places-autocomplete** | Google Places address autocomplete restricted to Ghana |
| **expo-auth-session** | OAuth authentication for Google Sign-In (web-based flow, works in Expo Go) |
| **react-native-paystack-webview** | Paystack payment integration (Mobile Money + Card) |
| **react-native-paystack-webview** | Paystack payment integration (Mobile Money + Card) |
| **expo-notifications** | Push notifications - unified API that handles FCM(android) and APNs(ios) automatically, no manual setup required. |
| **expo-image-picker** | Camera and gallery image selection for profile/portfolio photos |
| **react-native-reanimated** | Smooth animations for transitions, skeleton loaders, and gesture interactions |
| **expo-secure-store** | Secure storage for sensitive data like JWT tokens |
| **date-fns** | Date formatting and manipulation for bookings, time slots, and schedules |
| **Node.js** | Backend runtime environment for the API server |
| **Express** | Backend web framework handling all API routes, middleware, and request/response logic |
| **Supabase** | Backend database (PostgreSQL + PostGIS) — accessed via the Node.js API, not directly from the app |
| **Paystack** | Payment processing (client payments, Transfers API for barber payouts, Refund API) |
| **jsonwebtoken** | JWT generation and verification for API authentication |
| **bcryptjs** | Password hashing for user registration and login |
---

## 2. Development Philosophy

**Build feature by feature, fully functional before moving on.** Never scaffold empty screens or write placeholder components. Each feature should be implemented end-to-end: API integration, screen UI, navigation, error handling, loading states, and edge cases — all before starting the next feature.

**Follow this order:**
1. Build the backend endpoint first (or confirm it exists and works).
2. Build the screen UI with real data from the API.
3. Add loading, error, and empty states.
4. Wire up navigation to/from the screen.
5. Test the complete flow.
6. Move to the next feature.

**Do not:**
- Create files you won't immediately populate with working code.
- Use mock data when a real API endpoint is available.
- Build multiple screens at once — finish one, then start the next.
- Skip error or loading states — they are part of the feature, not polish.

**Do:**
- Keep components small and focused — one responsibility per component.
- Extract reusable components only when the same pattern appears three or more times.
- Write self-documenting code — clear variable names over comments.
- Handle every API response state: loading, success, empty, and error.

---

## 3. Build Strategy: Expo Go → Development Build

This project follows a two-phase build approach based on native module requirements.

### Phase A: Expo Go (UI & Core Flows)

Start development in **Expo Go** to move fast. Expo Go supports all the core libraries needed to build the UI, navigation, API integration, maps, and most features. Build out the following in Expo Go:

- All screen layouts and navigation
- Auth flow (email/password registration and login)
- Google Sign-In via `expo-auth-session` (web-based OAuth — works in Expo Go)
- Apple Sign-In via `expo-apple-authentication` (works in Expo Go on iOS)
- Barber onboarding wizard (all 4 steps + payout method)
- Search, discovery, barber profiles
- Booking flow (service → date/time → location → confirmation)
- Paystack payment via `react-native-paystack-webview` (WebView-based — works in Expo Go)
- My Bookings, reviews, notifications UI
- Barber dashboard, bookings management, earnings
- Staff management

### Phase B: Development Build (Native Modules & Release)

Switch to a **development build** (`npx expo run:android` / `npx expo run:ios` or EAS Build) when any of the following become necessary:

- Custom native Paystack SDK (if the WebView approach needs to be replaced with native checkout sheets for smoother UX)
- Native Google Sign-In via `@react-native-google-signin/google-signin` (if the web-based flow needs to be upgraded to native prompts)
- Push notification testing on physical devices with custom FCM configuration
- Any third-party library that requires custom native configuration or linking
- Release builds for TestFlight (iOS) or Play Store internal testing (Android)

### Transition Rule

**Stay in Expo Go as long as possible.** Only move to a development build when you hit an actual wall — not speculatively. When the transition happens, run `npx expo prebuild` to generate the native `ios/` and `android/` folders, then continue development with `npx expo run:android` or `npx expo run:ios`.

Document the transition point in a commit: `chore: switch from Expo Go to development build — [reason]`.

### Authentication Flow Details

**Email/Password (Primary):**
Standard registration and login via the backend API. User enters email + password → API returns JWT → stored in expo-secure-store.

**Google Sign-In:**
Uses `expo-auth-session` with Google OAuth provider during Expo Go phase. The flow: user taps "Continue with Google" → web-based Google consent screen opens → user authenticates → app receives the Google ID token → sends it to the backend API (`POST /api/auth/google`) → backend verifies the token with Google, creates or finds the user account, returns a JWT. The backend handles account creation and role assignment, not the client.

**Apple Sign-In (iOS only):**
Uses `expo-apple-authentication`. The flow: user taps "Sign in with Apple" → native Apple prompt appears → user authenticates with Face ID / Touch ID → app receives Apple identity token → sends it to the backend API (`POST /api/auth/apple`) → backend verifies, creates or finds user, returns JWT. Apple Sign-In button should only appear on iOS devices.

**Social auth and role selection:** When a user signs in with Google or Apple for the first time, the backend detects they have no existing account. The API returns a flag like `is_new_user: true`. The app then navigates them to the Role Selection screen before they can proceed — same as the email registration flow. Returning social auth users skip role selection and go straight to their dashboard.

---

## 4. Architecture Guidelines

### Folder Structure

```
/app                          # Expo Router file-based routes
  /(auth)                     # Auth screens (login, register, role selection)
    login.tsx
    register.tsx
    role-selection.tsx
    forgot-password.tsx
  /(client)                   # Client tab navigator and screens
    (tabs)
      _layout.tsx             # Bottom tab layout (Home, Search, Bookings, Profile)
      index.tsx               # Home screen
      search.tsx              # Search/Explore
      bookings.tsx            # My Bookings
      profile.tsx             # Client Profile
    barber/[id].tsx           # Barber profile detail
    booking/
      service-select.tsx
      date-time.tsx
      location-input.tsx
      confirmation.tsx
      payment.tsx
      success.tsx
    review/[bookingId].tsx
    notifications.tsx
  /(barber)                   # Barber tab navigator and screens
    (tabs)
      _layout.tsx             # Bottom tab layout (Dashboard, Bookings, Services, Profile)
      index.tsx               # Dashboard
      bookings.tsx            # Bookings (Upcoming, Requests, History)
      services.tsx            # Service management
      profile.tsx             # Barber Profile / Settings
    setup/                    # Profile setup wizard screens
      business-details.tsx
      location.tsx
      services.tsx
      working-hours.tsx
      payout-method.tsx
    earnings.tsx
    availability.tsx
    reviews.tsx
    staff/
      index.tsx               # Staff management list
      add.tsx                 # Add staff barber form
    notifications.tsx
  /(staff)                    # Staff barber limited screens
    (tabs)
      _layout.tsx
      index.tsx               # Dashboard (own bookings only)
      bookings.tsx
      reviews.tsx
      availability.tsx
    settings.tsx
  _layout.tsx                 # Root layout (auth check, role routing)

/components                   # Reusable UI components
  /ui                         # Atomic UI elements
    Button.tsx
    Input.tsx
    Badge.tsx
    Card.tsx
    Avatar.tsx
    StarRating.tsx
    Skeleton.tsx
    EmptyState.tsx
    ErrorState.tsx
    LoadingSpinner.tsx
  /booking                    # Booking-specific components
    BookingCard.tsx
    TimeSlotPill.tsx
    ServiceCard.tsx
    StatusBadge.tsx
    PaymentBadge.tsx
  /barber                     # Barber-specific components
    BarberResultCard.tsx
    BarberProfileHeader.tsx
    BarberScrollCard.tsx
    RequestCard.tsx
    OnboardingCard.tsx
  /maps                       # Map-related components
    LocationPicker.tsx         # Map + draggable pin + autocomplete
    RadiusSlider.tsx           # Slider + circle overlay for mobile barbers
    SearchResultsMap.tsx       # Map view for search results
  /layout                     # Layout components
    ScreenWrapper.tsx          # Safe area + scroll view wrapper
    TabBar.tsx                 # Custom bottom tab bar (if needed)

/services                     # API service layer
  api.ts                      # Axios instance with base URL + JWT interceptor
  auth.ts                     # Login, register, forgot password
  barbers.ts                  # Barber profile, search, available slots
  bookings.ts                 # Create, cancel, complete, accept, decline
  services.ts                 # CRUD for barber services
  workingHours.ts             # CRUD for working hours + breaks
  reviews.ts                  # Submit, edit, delete, respond, report
  notifications.ts            # Fetch, mark read
  staff.ts                    # Add, list, update, toggle, reset password
  payments.ts                 # Paystack helpers, payout method

/stores                       # Zustand stores
  authStore.ts                # Auth state (user, token, role, login/logout)
  locationStore.ts            # Client GPS coordinates
  bookingStore.ts             # In-progress booking state (selected service, date, time, location)
  filterStore.ts              # Search filters and sort preferences

/hooks                        # Custom React hooks
  useAuth.ts                  # Auth context shorthand
  useLocation.ts              # GPS permission + coordinates
  useDebounce.ts              # Debounced search input
  useOnboarding.ts            # Onboarding completion state

/utils                        # Pure utility functions
  formatCurrency.ts           # Format GHS amounts (e.g., "GHS 30.00")
  formatDate.ts               # Date/time formatting with date-fns
  formatDistance.ts            # Distance display (e.g., "3.2 km")
  validators.ts               # Email, phone, password validation
  generatePassword.ts         # Random password for staff barber creation
  constants.ts                # App-wide constants (API URL, map defaults, radius bounds)

/types                        # TypeScript type definitions
  user.ts                     # User, BarberProfile, StaffBarber
  booking.ts                  # Booking, BookingStatus, PaymentStatus
  service.ts                  # Service
  review.ts                   # Review
  notification.ts             # Notification
  api.ts                      # API response wrappers
```

### Key Architecture Rules

- **Expo Router handles all navigation.** Do not install `@react-navigation` separately. Use Expo Router's file-based routing and layouts.
- **API calls go through the `/services` layer.** Components never call Axios directly. They call functions from `/services` which return typed data.
- **React Query manages all server state.** Use `useQuery` for reads, `useMutation` for writes. No manual loading/error state management for API calls.
- **Zustand manages only client-side state** — auth session, GPS location, in-progress booking data, search filters. Never duplicate server data in Zustand.
- **TypeScript everywhere.** Every component, hook, utility, and API function must be typed. No `any` types unless absolutely unavoidable.

---

## 5. Styling Rules

**NativeWind (Tailwind CSS) is the only styling approach.** Do not use `StyleSheet.create()` unless a specific style is genuinely impossible to achieve with Tailwind classes. If you believe StyleSheet is needed, explain why before using it.

### Rules:

- All styling is done via `className` props using Tailwind utility classes.
- Use the Tailwind colour palette consistently. Define a custom colour theme in `tailwind.config.js` for the app's brand colours (primary, secondary, accent, etc.).
- Use `className` for layout, spacing, typography, colours, borders, shadows, and responsive adjustments.
- Dark mode is NOT required for this project. Design for light mode only.
- Use `gap-*` for spacing between flex children instead of margins on each child.
- Use `p-*` and `px-*` / `py-*` for padding. Be consistent — don't mix `p-4` on one screen and `p-5` on the next for the same type of container.

### Tailwind Config:

```javascript
// tailwind.config.js
module.exports = {
  content: ["./app/**/*.{tsx,ts}", "./components/**/*.{tsx,ts}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#fdb276',   // Primary dark — headers, buttons
          light: '#3f5159',     // Secondary dark — subheadings
          lighter: '#2a363b',   // Tertiary — less prominent text
        },
        accent: {
          DEFAULT: '#3c3cb9',   // Interactive elements — links, active states
          light: '#EBF4FF',     // Light accent background
        },
        success: '#38A169',     // Green — completed, confirmed, available
        warning: '#D69E2E',     // Amber — pending, approaching threshold
        danger: '#E53E3E',      // Red — errors, overdue, declined
        neutral: {
          50: '#ffffff',        // Lightest background
          100: '#f1f2f3f5',       // Card backgrounds
          200: '#E2E8F0',       // Borders, dividers
          300: '#CBD5E0',       // Disabled state
          400: '#A0AEC0',       // Placeholder text
          500: '#718096',       // Secondary text
          600: '#4A5568',       // Body text
          700: '#2D3748',       // Headings
          800: '#1A202C',       // Primary text
        },
      },
      fontFamily: {
        sans: ['Inter', 'System'],
      },
    },
  },
  plugins: [],
};
```

### When StyleSheet is Acceptable:

- Platform-specific shadows that NativeWind can't handle (e.g., Android `elevation`).
- Absolute positioning of map overlays where precise pixel values are needed.
- Dynamic styles computed at runtime that depend on device dimensions or animated values.

In these cases, use inline styles or a minimal StyleSheet — not a full stylesheet for the entire component.

---

## 6. UI Implementation Rules

Every screen must follow consistent visual rules. When building a screen, match these patterns exactly — do not freestyle spacing or font sizes.

### Spacing & Padding
- Screen container padding: `px-4 py-4` (16px on all sides).
- Card internal padding: `p-4`.
- Space between cards in a list: `gap-3` (12px).
- Space between sections on a screen: `mb-6` (24px).
- Space between a heading and its content: `mb-2` (8px).

### Typography Hierarchy
- Screen title (H1): `text-2xl font-bold text-neutral-800` (24px, bold).
- Section heading (H2): `text-lg font-semibold text-neutral-700` (18px, semibold).
- Card title: `text-base font-semibold text-neutral-800` (16px, semibold).
- Body text: `text-sm text-neutral-600` (14px, regular).
- Caption / helper text: `text-xs text-neutral-500` (12px, regular).
- Price display: `text-base font-bold text-neutral-800` (16px, bold).
- Badge text: `text-xs font-medium` (12px, medium).

### Border Radius & Shadows
- Cards: `rounded-xl` (12px radius) with `shadow-sm`.
- Buttons: `rounded-lg` (8px radius).
- Input fields: `rounded-lg` (8px radius) with `border border-neutral-200`.
- Avatar / profile photos: `rounded-full`.
- Badges and chips: `rounded-full` with `px-3 py-1`.
- Map containers: `rounded-xl overflow-hidden`.

### Alignment & Positioning
- Use `flex-row items-center` for horizontal layouts with vertical centring.
- Use `flex-1` to fill available space in flex containers.
- Fixed bottom buttons: use `absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-neutral-200` or a safe-area-aware wrapper.
- List screens: `FlatList` with `contentContainerStyle` for padding, not wrapping in a `ScrollView`.
- Horizontal scrolling sections (featured barbers, staff cards): `FlatList` with `horizontal` prop and `showsHorizontalScrollIndicator={false}`.

### Interactive States
- Button pressed state: reduce opacity with `active:opacity-80`.
- Disabled buttons: `opacity-50` and `disabled` prop.
- Selected state (time slots, services): primary colour background `bg-accent` with white text `text-white`.
- Unselected state: `bg-neutral-100 text-neutral-600`.
- Focus state on inputs: `border-accent` (blue border).
- For any default in app modal asking the user to confirm an action, replace it with a "custom made in app modal" that suits that action/request.

---

## 7. Decision Making & Clarifications

When building a feature, follow these rules for making decisions:

### If Something Is Unclear:
- **Do not guess.** Ask the user for clarification before implementing.
- Phrase it as a specific question: "The booking confirmation screen needs a cancellation policy note. Should this be a static text or fetched from the platform settings API?"

### If Something Could Be Improved:
- **Proactively suggest better approaches.** Don't silently implement a suboptimal solution.
- Format suggestions as: "This works, but [alternative approach] would be better because [reason]. Should I use that instead?"
- Example: "We could build the time slot picker with a basic FlatList, but `react-native-reanimated-carousel` would give smoother horizontal scrolling with snap behaviour. Want me to add it?"

### If a New Library Would Help:
- **Never install a library without asking first.**
- Explain: what the library does, why it's better than a manual implementation, and what the tradeoff is (bundle size, complexity).
- Example: "This date picker could be built manually, but `react-native-calendars` provides a polished calendar component with day marking, disabled dates, and theme support out of the box. It would save about a day of work. Should I add it?"
- Wait for user approval before running `npx expo install` or `npm install`.

### If You Encounter a Bug or Issue:
- **Fix it immediately.** Don't skip and come back later.
- Explain what the issue was and how you fixed it.
- If the fix requires a structural change (e.g., changing how a store works), explain the change before making it.

---

## 8. Code Quality Standards

### Naming Conventions
- **Files:** kebab-case for utilities (`format-currency.ts`), PascalCase for components (`BookingCard.tsx`), camelCase for hooks (`useAuth.ts`).
- **Components:** PascalCase. Named exports. One component per file.
- **Functions:** camelCase. Descriptive verbs: `fetchBarberProfile`, `handleBookingCancel`, `formatTimeSlot`.
- **Types/Interfaces:** PascalCase with descriptive names: `BookingStatus`, `BarberProfile`, `CreateBookingPayload`.
- **Constants:** UPPER_SNAKE_CASE: `API_BASE_URL`, `MAX_RADIUS_KM`, `PAYMENT_DEADLINE_HOURS`.
- **Boolean variables:** Prefix with `is`, `has`, `should`, `can`: `isLoading`, `hasServices`, `canCancel`.

### Component Patterns
```tsx
// Standard component structure
import { View, Text, Pressable } from 'react-native';

interface BookingCardProps {
  booking: Booking;
  onPress: (id: string) => void;
}

export function BookingCard({ booking, onPress }: BookingCardProps) {
  return (
    <Pressable
      className="bg-white rounded-xl shadow-sm p-4"
      onPress={() => onPress(booking.id)}
    >
      <Text className="text-base font-semibold text-neutral-800">
        {booking.serviceName}
      </Text>
    </Pressable>
  );
}
```

### API Integration Pattern
```tsx
// In /services/bookings.ts
import { api } from './api';
import { Booking, CreateBookingPayload } from '@/types/booking';

export const bookingsService = {
  getClientBookings: (status?: string) =>
    api.get<Booking[]>('/bookings/client', { params: { status } }),

  createBooking: (payload: CreateBookingPayload) =>
    api.post<Booking>('/bookings', payload),

  completeBooking: (id: string) =>
    api.put<Booking>(`/bookings/${id}/complete`),
};

// In screen or component — use React Query
import { useQuery, useMutation } from '@tanstack/react-query';
import { bookingsService } from '@/services/bookings';

function MyBookingsScreen() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bookings', 'upcoming'],
    queryFn: () => bookingsService.getClientBookings('upcoming'),
  });

  if (isLoading) return <BookingsSkeleton />;
  if (error) return <ErrorState onRetry={refetch} />;
  if (!data?.length) return <EmptyState message="No bookings yet" />;

  return <FlatList data={data} renderItem={...} />;
}
```

### Error Handling
- Every API call must handle loading, success, empty, and error states.
- Use React Query's built-in states (`isLoading`, `isError`, `data`).
- Display user-friendly error messages, never raw error objects or stack traces.
- Network errors: "Something went wrong. Check your connection and try again." with a retry button.
- Validation errors: inline field-level messages below the relevant input.
- Toast notifications for success actions: "Booking confirmed!", "Review submitted!", "Service added!"

---

## 9. Navigation & Routing Rules

**Expo Router is the only navigation system.** Follow these rules:

- Use layout files (`_layout.tsx`) for tab navigators and stack groups.
- Use route groups (parenthesised folders like `(auth)`, `(client)`, `(barber)`) to organise screens by role.
- The root `_layout.tsx` checks auth state on mount: if no token → redirect to `/(auth)/login`. If token exists → check role → redirect to the appropriate group.
- Deep linking: notifications should use Expo Router's linking config to navigate directly to the relevant screen (e.g., a booking confirmation notification opens `/(client)/bookings`).
- Use `router.push()` for forward navigation, `router.back()` for going back, `router.replace()` for replacing the current screen (e.g., after login).
- Modal screens (e.g., add service form, review form) use `presentation: 'modal'` in the route config.

---

## 10. State Management Rules

### Zustand (Client-Side State Only)
```tsx
// stores/authStore.ts
import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: User | null;
  role: 'client' | 'barber' | 'staff_barber' | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  role: null,
  setAuth: (token, user) => set({ token, user, role: user.role }),
  logout: () => set({ token: null, user: null, role: null }),
}));
```

### What Goes in Zustand:
- Auth state (token, user, role)
- Client GPS coordinates
- In-progress booking data (selected service, barber, date, time, location) — cleared after booking is complete
- Search filter preferences

### What Does NOT Go in Zustand:
- Any data that comes from the API (bookings list, barber profiles, reviews) — this belongs in React Query's cache.
- Onboarding completion flags — these come from the API (`/profile/completeness`).

---

## 11. Performance Guidelines

- Use `FlatList` for all list screens — never `ScrollView` with `.map()` for lists longer than 10 items.
- Use `React.memo()` on list item components to prevent unnecessary re-renders.
- Images: use `expo-image` instead of the default `Image` component for caching and progressive loading.
- Skeleton loaders: show skeletons immediately while data loads. Never show a blank screen.
- Debounce search input: wait 300ms after the user stops typing before firing the search API call.
- Paginate API calls: search results and booking history should load in pages of 20 items. Use React Query's `useInfiniteQuery` for infinite scroll.
- Prefetch: when the client views a barber profile, prefetch the available slots for today's date in the background.

---

## 12. Security Rules

- Store JWT tokens in `expo-secure-store`, not `AsyncStorage`.
- Never log tokens, passwords, or payment references to the console in production.
- All API requests go through HTTPS.
- Validate inputs client-side before sending to the API (email format, phone format, password length) — but always validate server-side too.
- Payment references (Paystack) are generated server-side and verified server-side. The client app never processes payment logic directly — it only opens the Paystack WebView and reports back the reference.
Google and Apple OAuth tokens are verified server-side only. The client sends the identity token to the backend, and the backend verifies it directly with Google/Apple before creating a session. Never trust OAuth tokens on the client alone.
- Do not store sensitive user data (full payment details, bank accounts) in AsyncStorage or Zustand. These live only on the server.

---

## 13. Git & Version Control

- Commit after each completed feature (not after each file change).
- Commit messages follow conventional format: `feat: add barber profile setup wizard`, `fix: time slot calculation for blocked dates`, `style: update booking card layout`.
- Keep commits atomic — one feature or fix per commit.
- Do not commit `.env` files, API keys, or `node_modules`.

---

## 14. Common Patterns Reference

### Screen Template
Every screen should follow this base structure:
```tsx
import { View, Text } from 'react-native';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';

export default function MyScreen() {
  return (
    <ScreenWrapper>
      <View className="px-4 py-4">
        <Text className="text-2xl font-bold text-neutral-800 mb-6">
          Screen Title
        </Text>
        {/* Screen content */}
      </View>
    </ScreenWrapper>
  );
}
```

### Empty State Template
```tsx
<View className="flex-1 items-center justify-center px-8 py-16">
  {/* Illustration or icon */}
  <Text className="text-lg font-semibold text-neutral-700 mt-4 text-center">
    No bookings yet
  </Text>
  <Text className="text-sm text-neutral-500 mt-2 text-center">
    Find a barber and book your first appointment!
  </Text>
  <Pressable className="bg-accent rounded-lg px-6 py-3 mt-6">
    <Text className="text-white font-semibold">Find a Barber</Text>
  </Pressable>
</View>
```

### Loading Skeleton Template
```tsx
<View className="bg-neutral-100 rounded-xl p-4 animate-pulse">
  <View className="h-4 bg-neutral-200 rounded w-3/4 mb-3" />
  <View className="h-3 bg-neutral-200 rounded w-1/2 mb-2" />
  <View className="h-3 bg-neutral-200 rounded w-2/3" />
</View>
```

---

## Quick Reference: What NOT To Do

- ❌ Do not use `StyleSheet.create()` unless Tailwind genuinely cannot handle the style.
- ❌ Do not install libraries without asking the user first.
- ❌ Do not create empty placeholder files or scaffold screens you won't implement immediately.
- ❌ Do not use `any` as a TypeScript type.
- ❌ Do not use `ScrollView` with `.map()` for lists — use `FlatList`.
- ❌ Do not store API data in Zustand — use React Query.
- ❌ Do not store tokens in AsyncStorage — use expo-secure-store.
- ❌ Do not skip loading, error, or empty states on any screen.
- ❌ Do not hardcode colours — use the Tailwind theme config.
- ❌ Do not use emojis as icons in any part of the app.
- ❌ Do not build multiple features simultaneously — finish one completely, then move to the next.
