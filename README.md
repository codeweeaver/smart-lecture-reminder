================================================================
NOUN SMART LECTURE REMINDER — SUBMISSION DISC
================================================================

## WHAT'S ON THIS DISC

project-report/ The final project report (Word + PDF).
app/ Full source code for the application.
documentation/ README (as PDF) and system diagrams
(use case, ER, architecture, etc.).

## LIVE APPLICATION

The app is deployed and live at:

    https://smart-lecture-reminder-noun.netlify.app

Since this is a cloud-connected Progressive Web App (React
frontend + Supabase backend), the easiest way to evaluate it
is to open that URL directly — no setup required. Demo
accounts and their credentials are documented in the project
report.

## RUNNING THE SOURCE CODE LOCALLY (optional)

The source code in app/ does not ship its
dependencies (node_modules) to keep the disc small — they are
fully regenerable. To run it locally:

    1. Install Node.js (v20 or later) from nodejs.org
    2. Open a terminal inside app/
    3. Run:  npm install
    4. Copy .env.example to .env and fill in your own Supabase
       project URL/keys (see app/README.md, section
       "Environment Variables")
    5. Run:  npm run dev
    6. Open the URL shown in the terminal (usually
       http://localhost:5173)

A pre-built production bundle is also included at
app/dist/ (run `npm run preview` from inside
app/ after `npm install` to serve it), though it
still requires the same Supabase backend configuration to
function fully.

## PROJECT SUMMARY

A Progressive Web App that gives NOUN students personalised
push notifications for their Zoom lectures, TMA deadlines, and
facilitator announcements replacing the manual process of
checking the eLearn portal every day. Full details, screenshots,
and architecture are in the project report and documentation/.
================================================================
