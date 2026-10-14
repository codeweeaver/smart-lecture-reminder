# Smart Lecture Reminder — Updated UML Diagrams
# Render each block at https://mermaid.live then insert the image into the report
# at the corresponding figure placeholder position.
#
# CHANGED FROM ORIGINAL:
# - Figure 3.4.4 (Sequence Diagram): Netlify Scheduled Function → Supabase Edge Function
#   invoked by Supabase Cron (pg_cron + pg_net)
# - Figure 3.4.5 (System Architecture): "Netlify Serverless Function Layer" →
#   "Supabase Edge Function Layer"; Netlify now appears only as static hosting
#
# Figures 3.4.1, 3.4.2, 3.4.3 are UNCHANGED — use existing rendered images.

---

## Figure 3.4.1 — Use Case Diagram (UNCHANGED)
## Use at https://mermaid.live — no changes needed from original

```mermaid
graph TD
    Admin([Administrator])
    Lecturer([Lecturer / Facilitator])
    Student([Student])

    UC1(Register / Login / Forgot Password)
    UC2(Approve Pending Lecturer)
    UC3(Manage Lecture - Full CRUD)
    UC4(Bulk Import Lectures via CSV)
    UC5(Manage TMA Deadlines)
    UC6(Manage Users)
    UC7(Manage Semester Settings)
    UC8(Reschedule Assigned Lecture)
    UC9(Cancel Assigned Lecture with Reason)
    UC10(Post Lecture Announcement)
    UC11(Add Recording URL)
    UC12(Complete Onboarding - Upload Reg Slip)
    UC13(View Personalized Calendar)
    UC14(Receive Push Notifications)
    UC15(Self-Track Attendance)
    UC16(Manage Notification Preferences)
    UC17(Install PWA / Use Offline)

    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    Admin --> UC5
    Admin --> UC6
    Admin --> UC7

    Lecturer --> UC1
    Lecturer --> UC8
    Lecturer --> UC9
    Lecturer --> UC10
    Lecturer --> UC11

    Student --> UC1
    Student --> UC12
    Student --> UC13
    Student --> UC14
    Student --> UC15
    Student --> UC16
    Student --> UC17

    UC8 -.triggers.-> UC14
    UC9 -.triggers.-> UC14
    UC10 -.triggers.-> UC14
    UC11 -.triggers.-> UC14
    UC3 -.triggers.-> UC13
```

---

## Figure 3.4.2 — Entity Relationship Diagram (UNCHANGED)
## No changes needed from original

```mermaid
erDiagram
    USERS ||--o{ LECTURER_COURSES : "assigned to"
    COURSES ||--o{ LECTURER_COURSES : "has"
    USERS ||--o{ ENROLLMENTS : "enrolls in"
    COURSES ||--o{ ENROLLMENTS : "has"
    COURSES ||--o{ LECTURES : "scheduled as"
    USERS ||--o{ LECTURES : "facilitates"
    USERS ||--o{ ATTENDANCE : "self-reports"
    LECTURES ||--o{ ATTENDANCE : "recorded for"
    COURSES ||--o{ TMA_DEADLINES : "has"
    USERS ||--o{ NOTIFICATIONS : "receives"
    LECTURES ||--o{ NOTIFICATIONS : "triggers"

    USERS {
        uuid id PK
        text email
        text full_name
        text role
        text status
        jsonb push_subscriptions
        jsonb notification_preferences
        boolean onboarding_complete
    }
    COURSES {
        uuid id PK
        text course_code
        text course_title
        text programme
        integer level
        text semester
        text academic_session
    }
    LECTURER_COURSES {
        uuid id PK
        uuid lecturer_id FK
        uuid course_id FK
        text academic_session
    }
    LECTURES {
        uuid id PK
        uuid course_id FK
        uuid facilitator_id FK
        timestamptz start_time
        timestamptz end_time
        text status
        text meeting_web_url
        text announcement
        jsonb notifications_sent
    }
    ENROLLMENTS {
        uuid id PK
        uuid user_id FK
        uuid course_id FK
        text academic_session
        boolean expired
    }
    ATTENDANCE {
        uuid id PK
        uuid user_id FK
        uuid lecture_id FK
        text status
        text note
    }
    TMA_DEADLINES {
        uuid id PK
        uuid course_id FK
        integer tma_number
        timestamptz due_date
        boolean reminder_sent
    }
    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        uuid lecture_id FK
        text type
        boolean read
    }
    APP_SETTINGS {
        text key PK
        text value
    }
```

---

## Figure 3.4.3 — Activity Diagram: Student Onboarding (UNCHANGED)
## No changes needed from original

```mermaid
flowchart TD
    Start([Student Registers]) --> Step1[Step 1: Select Programme and Level]
    Step1 --> Step2{Upload Course Registration Slip}
    Step2 -->|Digital PDF| Extract[PDF.js Extracts Course Codes In-Browser]
    Step2 -->|Scanned Image| Manual[Manual Course Selection from Catalogue]
    Extract --> PreTick[Pre-Tick Matching Courses for Confirmation]
    PreTick --> Confirm{Student Reviews and Confirms}
    Manual --> Confirm
    Confirm -->|Adjust Selections| PreTick
    Confirm -->|Confirmed| WriteEnroll[(Write Enrollment Records to Supabase)]
    WriteEnroll --> Step3[Step 3: Request Web Push Permission]
    Step3 --> Subscribe{Permission Granted?}
    Subscribe -->|Yes| SaveSub[(Save Push Subscription to users table)]
    Subscribe -->|No| SkipPush[Continue Without Push - In-App Only]
    SaveSub --> Step4[Step 4: PWA Install Prompt]
    SkipPush --> Step4
    Step4 --> Dashboard([Onboarding Complete - Dashboard Shown])
```

---

## Figure 3.4.4 — Sequence Diagram: Push Notification Delivery (UPDATED)
## CHANGED: Netlify Scheduled Function → Supabase Edge Function invoked by pg_cron + pg_net

```mermaid
sequenceDiagram
    participant S as Student Browser
    participant SW as Service Worker
    participant SB as Supabase DB
    participant EF as Supabase Edge Function
    participant CR as Supabase Cron (pg_cron + pg_net)
    participant CI as cancel-notify Edge Function
    participant PS as Browser Push Service
    participant D as Student Device

    Note over S,SW: Subscription Phase (Onboarding)
    S->>SW: Grant notification permission
    SW->>S: PushSubscription (endpoint, p256dh, auth)
    S->>SB: Save subscription to users.push_subscriptions

    Note over CR,D: Automated Reminder Path (every 5 minutes)
    CR->>EF: net.http_post to send-reminders/invoke (x-cron-secret)
    EF->>SB: Query lectures where start_time in [now+28m, now+32m]
    SB-->>EF: Matching lecture records
    EF->>SB: Query enrollments and push_subscriptions for course
    SB-->>EF: Enrolled students and subscriptions
    EF->>PS: web-push sendNotification via _shared/push.ts (VAPID-signed)
    PS->>D: OS-level push notification delivered
    EF->>SB: UPDATE lectures SET notifications_sent.30min = true
    EF->>SB: INSERT notification record

    Note over CI,D: Instant Notification Path (Lecturer Action)
    S->>CI: POST /cancel-notify/invoke (x-internal-secret header)
    CI->>CI: Validate CANCEL_NOTIFY_SECRET
    CI->>SB: Query enrolled students and subscriptions
    SB-->>CI: Subscriptions
    CI->>PS: web-push sendNotification via _shared/push.ts (VAPID-signed)
    PS->>D: Instant OS-level push notification
    CI->>SB: INSERT notification record
    CI->>SB: If rescheduled - reset notifications_sent flags

    Note over SW,D: Notification Click
    D->>SW: User taps notification
    SW->>S: Open /calendar?lectureId=... or meeting URL
```

---

## Figure 3.4.5 — System Architecture Diagram (UPDATED)
## CHANGED: "Netlify Serverless Function Layer" removed; Supabase Edge Function Layer added;
##          Netlify now appears only as Static Hosting in the Front-End layer

```mermaid
graph TD
    subgraph USER["User Layer"]
        SB["Student Browser"]
        FB["Facilitator Browser"]
        AB["Administrator Browser"]
    end

    subgraph FRONTEND["Front-End Layer - React 18 PWA (hosted on Netlify)"]
        APP["React SPA - Vite + Tailwind CSS + Motion + PDF.js"]
        SW["Service Worker - Workbox cache-first static + NetworkFirst API"]
    end

    subgraph BACKEND["Back-End Layer - Supabase"]
        DB["PostgreSQL - 9 tables with Row Level Security"]
        AUTH["Supabase Auth - email and password"]
        RT["Supabase Realtime - WebSocket channels"]
        CRON["Supabase Cron - pg_cron + pg_net - every 5 minutes"]
    end

    subgraph EDGEFN["Supabase Edge Function Layer - Deno Runtime"]
        SR["send-reminders/index.ts - invoked by Cron via net.http_post"]
        CN["cancel-notify/index.ts - invoked by React app on lecturer action"]
        SH["_shared/push.ts - shared VAPID web-push send logic"]
    end

    subgraph PUSH["Push Delivery Layer"]
        PS["Browser Push Services - Chrome, Firefox, Edge, Safari"]
        DEV["Student Device - OS-level Notification"]
    end

    SB --> APP
    FB --> APP
    AB --> APP
    APP <--> SW
    APP <-->|HTTPS REST| DB
    APP <-->|WebSocket| RT
    APP -->|POST with x-internal-secret| CN
    DB <-->|Service Role Key auto-injected| SR
    DB <-->|Service Role Key auto-injected| CN
    CRON -->|net.http_post every 5 min| SR
    SR --> SH
    CN --> SH
    SH -->|web-push VAPID| PS
    PS --> DEV
```
