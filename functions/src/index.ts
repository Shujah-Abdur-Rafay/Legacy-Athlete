import * as functions from "firebase-functions";
import * as functionsV1 from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { Response } from "express";
import Stripe from "stripe";
import { Resend } from "resend";
import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";
import { addDays, setHours, setMinutes, startOfDay, isAfter, format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const corsLib = require("cors");

// ── CORS allowlist ────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://legacyathlete.fit",
  "https://www.legacyathlete.fit",
  "https://limitlessathlete.com",
  "https://www.limitlessathlete.com",
  "https://limitless-athlete-1e02a.web.app",
  "https://limitless-athlete-1e02a.firebaseapp.com",
  "https://limitless-athlete--first-session-pi.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:3000",
];

const corsHandler = corsLib({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin header (server-to-server, Stripe webhooks, curl)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
});

// Strict CORS utility — only sets Allow-Origin for trusted origins
function applyCors(req: any, res: Response, next: () => void) {
  const origin = req.headers.origin as string | undefined;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Vary", "Origin");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  corsHandler(req, res, next);
}

admin.initializeApp();
const db = admin.firestore();

// ─── Constants ────────────────────────────────────────────────────────────────
const CST_TIMEZONE = "America/Chicago";
const MAX_ATTENDANCE = 12;
const COACH_EMAIL = "mw@thelimitlessathlete.com";

// Training schedule (default fallback — used only when Firestore schedule_templates collection is empty)
const DEFAULT_SCHEDULE = [
  { day: 1, times: [{ h: 18, m: 30, focus: "Speed & Agility (GS)", duration: 30 }, { h: 19, m: 0, focus: "Total Skills/IQ/Gameplay (GS)", duration: 60 }] },
  { day: 2, times: [{ h: 18, m: 30, focus: "Strength + Power (GS)", duration: 30 }, { h: 19, m: 0, focus: "Shooting (300+) (GS)", duration: 60 }] },
  { day: 3, times: [{ h: 18, m: 30, focus: "Mobility + Cond. (GS)", duration: 30 }, { h: 19, m: 0, focus: "Ball Handling (GS)", duration: 60 }] },
  { day: 4, times: [{ h: 18, m: 30, focus: "Speed & Agility (GS)", duration: 30 }, { h: 19, m: 0, focus: "Total Skills/IQ/Gameplay (GS)", duration: 60 }] },
  { day: 6, times: [{ h: 8, m: 0, focus: "Select Practice (GS)", duration: 60 }, { h: 9, m: 0, focus: "Strength + Power (GS)", duration: 30 }, { h: 9, m: 30, focus: "Game prep: footwork and skills (GS)", duration: 60 }] },
];

interface ScheduleSlot { h: number; m: number; focus: string; duration: number; }
interface ScheduleDay { day: number; times: ScheduleSlot[]; active?: boolean; }

async function loadScheduleFromFirestore(): Promise<ScheduleDay[]> {
  try {
    const snap = await db.collection("schedule_templates").get();
    if (snap.empty) return DEFAULT_SCHEDULE;
    const days: ScheduleDay[] = [];
    snap.docs.forEach((d) => {
      const data = d.data() as any;
      if (data.active === false) return;
      const day = typeof data.day === "number" ? data.day : parseInt(d.id, 10);
      if (isNaN(day) || !Array.isArray(data.times)) return;
      days.push({ day, times: data.times.filter((t: any) => typeof t?.h === "number" && typeof t?.m === "number" && t?.focus && typeof t?.duration === "number") });
    });
    return days.length ? days : DEFAULT_SCHEDULE;
  } catch (e) {
    console.error("[loadSchedule] Firestore read failed, using defaults:", e);
    return DEFAULT_SCHEDULE;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY environment variable not set");
  return key;
}

function getResendKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY environment variable not set");
  return key;
}

function initStripe(): Stripe {
  return new Stripe(getStripeKey(), { apiVersion: "2024-04-10" as any });
}

function initResend(): Resend {
  return new Resend(getResendKey());
}

/**
 * Initialise Google Calendar client using the project service account.
 * Credentials are read from environment variables:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  — service account client_email
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY — service account private_key (with \n literals)
 *
 * No OAuth flow or Firestore token storage required.
 * Returns null (non-fatal) if credentials are missing.
 */
function initCalendarWithServiceAccount() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !rawKey) {
    console.warn("[Calendar] Service account credentials not set. Calendar skipped.");
    return null;
  }

  const privateKey = rawKey.replace(/\\n/g, "\n");

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
      ],
    });
    return google.calendar({ version: "v3", auth });
  } catch (err) {
    console.error("[Calendar] Failed to create JWT client:", err);
    return null;
  }
}

/**
 * Get the shared calendar ID.
 * Priority: env var → Firestore → auto-create a new calendar.
 * The calendar is created once and its ID is persisted to Firestore settings/shared_calendar.
 */
async function getOrCreateSharedCalendarId(): Promise<string> {
  // 1. Env override
  const envId = process.env.SHARED_CALENDAR_ID;
  if (envId) return envId;

  // 2. Firestore cache
  try {
    const snap = await db.collection("settings").doc("shared_calendar").get();
    if (snap.exists && snap.data()?.calendarId) {
      return snap.data()!.calendarId as string;
    }
  } catch (e) {
    console.warn("[Calendar] Could not read shared_calendar from Firestore:", e);
  }

  // 3. Auto-create
  const calendar = initCalendarWithServiceAccount();
  if (!calendar) {
    console.warn("[Calendar] Cannot create shared calendar — service account not configured.");
    return "primary";
  }

  try {
    const created = await calendar.calendars.insert({
      requestBody: {
        summary: "Legacy Athlete Schedule",
        description: "Shared training calendar for all Legacy Athlete sessions.",
        timeZone: CST_TIMEZONE,
      },
    });

    const calendarId = created.data.id!;

    // Make the calendar publicly readable
    await calendar.acl.insert({
      calendarId,
      requestBody: { role: "reader", scope: { type: "default" } },
    });

    // Store in Firestore
    await db.collection("settings").doc("shared_calendar").set({
      calendarId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("[Calendar] Shared calendar created:", calendarId);
    return calendarId;
  } catch (err) {
    console.error("[Calendar] Failed to create shared calendar:", err);
    return "primary";
  }
}

// Keep initCalendarAsync as an alias for backward compatibility during transition
async function initCalendarAsync() {
  return initCalendarWithServiceAccount();
}

function generateICS(sessionDate: Date, endDate: Date, athleteName: string, focus: string, bookingId: string): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Legacy Athlete//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${bookingId}@limitlessathlete`,
    `DTSTART:${fmt(sessionDate)}`,
    `DTEND:${fmt(endDate)}`,
    `SUMMARY:Legacy Athlete Training - ${focus}`,
    `DESCRIPTION:Training session for ${athleteName}\\nFocus: ${focus}\\nBooking ID: ${bookingId}`,
    "LOCATION:Legacy Athlete Training Facility",
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Legacy Athlete Training Session in 1 hour",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function buildAthleteEmail(athleteName: string, sessionDate: Date, endDate: Date, focus: string, bookingId: string, cancellationToken: string): string {
  const baseUrl = process.env.APP_BASE_URL || "https://legacyathlete.fit";
  const cancelUrl = `${baseUrl}/cancel?token=${cancellationToken}`;
  const dateStr = format(toZonedTime(sessionDate, CST_TIMEZONE), "EEEE, MMMM do, yyyy");
  const timeStr = `${format(toZonedTime(sessionDate, CST_TIMEZONE), "h:mm a")} – ${format(toZonedTime(endDate, CST_TIMEZONE), "h:mm a")} CST`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Booking Confirmed – Legacy Athlete</title>
<style>
  body { margin: 0; padding: 0; background: #000; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .container { max-width: 560px; margin: 0 auto; background: #0a0a0a; border: 1px solid #1c1917; }
  .header { background: #000; padding: 40px 40px 24px; border-bottom: 1px solid #1c1917; }
  .logo { font-size: 11px; letter-spacing: 0.4em; color: #ea580c; text-transform: uppercase; margin-bottom: 8px; }
  .headline { font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -0.02em; line-height: 1.2; margin: 0; }
  .badge { display: inline-block; background: #ea580c; color: #fff; font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; padding: 4px 12px; margin-top: 16px; }
  .body-section { padding: 32px 40px; }
  .greeting { color: #a8a29e; font-size: 14px; margin-bottom: 20px; }
  .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #1c1917; }
  .detail-label { font-size: 10px; color: #57534e; text-transform: uppercase; letter-spacing: 0.15em; }
  .detail-value { font-size: 13px; color: #fff; font-weight: 600; text-align: right; max-width: 60%; }
  .focus-badge { font-size: 11px; color: #ea580c; text-transform: uppercase; letter-spacing: 0.1em; }
  .cta-section { padding: 24px 40px 32px; background: #111; border-top: 1px solid #1c1917; }
  .cancel-link { color: #57534e; font-size: 11px; text-decoration: underline; }
  .footer { padding: 24px 40px; border-top: 1px solid #1c1917; }
  .footer-text { color: #44403c; font-size: 10px; line-height: 1.6; }
  .booking-id { font-family: monospace; color: #57534e; font-size: 10px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">Legacy Athlete</div>
    <h1 class="headline">YOUR SESSION<br>IS CONFIRMED.</h1>
    <div class="badge">✓ Booking Confirmed</div>
  </div>
  <div class="body-section">
    <p class="greeting">Hey ${athleteName}, you're locked in. Here are your session details:</p>
    <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${dateStr}</span></div>
    <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${timeStr}</span></div>
    <div class="detail-row"><span class="detail-label">Training Focus</span><span class="detail-value focus-badge">${focus}</span></div>
    <div class="detail-row"><span class="detail-label">Coach</span><span class="detail-value">MW – Legacy Athlete</span></div>
    <div class="detail-row" style="border-bottom: none;"><span class="detail-label">Booking ID</span><span class="booking-id">${bookingId}</span></div>
  </div>
  <div class="cta-section">
    <p style="color: #a8a29e; font-size: 13px; margin: 0 0 16px;">A calendar invite (.ics) is attached to this email. Add it to your calendar to stay locked in.</p>
    <p style="color: #57534e; font-size: 11px; margin: 0;">Need to cancel? <a href="${cancelUrl}" class="cancel-link">Click here to cancel your booking</a>. Cancellations must be made at least 24 hours in advance.</p>
  </div>
  <div class="footer">
    <p class="footer-text">© Legacy Athlete. This email was sent because you booked a training session.<br>
    If you did not make this booking, contact us at ${COACH_EMAIL}</p>
  </div>
</div>
</body>
</html>`;
}

function buildCoachEmail(athleteName: string, athleteEmail: string, sessionDate: Date, focus: string, sessionId: string, bookingId: string, paymentStatus: string, calendarEventId: string): string {
  const dateStr = format(toZonedTime(sessionDate, CST_TIMEZONE), "EEEE, MMMM do, yyyy");
  const timeStr = format(toZonedTime(sessionDate, CST_TIMEZONE), "h:mm a") + " CST";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8">
<style>
  body { margin:0; background:#000; font-family:'Helvetica Neue',Arial,sans-serif; }
  .c { max-width:560px; margin:0 auto; background:#0a0a0a; border:1px solid #1c1917; }
  .h { background:#111; padding:32px 40px; border-bottom:1px solid #1c1917; }
  .tag { font-size:9px; letter-spacing:0.4em; color:#ea580c; text-transform:uppercase; }
  h1 { font-size:22px; color:#fff; margin:8px 0 0; }
  .b { padding:32px 40px; }
  .row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #1c1917; }
  .lbl { font-size:10px; color:#57534e; text-transform:uppercase; letter-spacing:0.15em; }
  .val { font-size:13px; color:#fff; font-weight:600; }
  .mono { font-family:monospace; font-size:11px; color:#78716c; word-break:break-all; }
  .f { padding:20px 40px; border-top:1px solid #1c1917; }
  .f p { color:#44403c; font-size:10px; }
</style>
</head>
<body>
<div class="c">
  <div class="h"><div class="tag">🔔 New Booking Alert</div><h1>New Athlete Confirmed</h1></div>
  <div class="b">
    <div class="row"><span class="lbl">Athlete Name</span><span class="val">${athleteName}</span></div>
    <div class="row"><span class="lbl">Athlete Email</span><span class="val">${athleteEmail}</span></div>
    <div class="row"><span class="lbl">Session Date</span><span class="val">${dateStr}</span></div>
    <div class="row"><span class="lbl">Session Time</span><span class="val">${timeStr}</span></div>
    <div class="row"><span class="lbl">Training Focus</span><span class="val" style="color:#ea580c;">${focus}</span></div>
    <div class="row"><span class="lbl">Payment Status</span><span class="val" style="color:#22c55e;">${paymentStatus}</span></div>
    <div class="row"><span class="lbl">Session ID</span><span class="mono">${sessionId}</span></div>
    <div class="row"><span class="lbl">Booking ID</span><span class="mono">${bookingId}</span></div>
    <div class="row" style="border-bottom:none;"><span class="lbl">Calendar Event</span><span class="mono">${calendarEventId || "N/A"}</span></div>
  </div>
  <div class="f"><p>Legacy Athlete Booking System — Auto-generated notification.</p></div>
</div>
</body>
</html>`;
}

function buildWelcomeEmail(email: string, displayName?: string): string {
  const name = displayName || email.split("@")[0];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to Legacy Athlete</title>
<style>
  body { margin: 0; padding: 0; background: #000; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .container { max-width: 560px; margin: 0 auto; background: #0a0a0a; border: 1px solid #1c1917; }
  .header { background: #000; padding: 40px 40px 24px; border-bottom: 1px solid #1c1917; }
  .logo { font-size: 11px; letter-spacing: 0.4em; color: #ea580c; text-transform: uppercase; margin-bottom: 8px; }
  .headline { font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -0.02em; line-height: 1.2; margin: 0; }
  .badge { display: inline-block; background: #ea580c; color: #fff; font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; padding: 4px 12px; margin-top: 16px; }
  .body-section { padding: 32px 40px; }
  .greeting { color: #a8a29e; font-size: 14px; margin-bottom: 24px; line-height: 1.6; }
  .step-row { display: flex; align-items: flex-start; padding: 14px 0; border-bottom: 1px solid #1c1917; }
  .step-num { font-size: 10px; color: #ea580c; letter-spacing: 0.2em; min-width: 32px; font-weight: 700; }
  .step-text { font-size: 12px; color: #d4ccc8; line-height: 1.5; }
  .cta-section { padding: 24px 40px 32px; background: #111; border-top: 1px solid #1c1917; }
  .cta-btn { display: inline-block; background: #ea580c; color: #fff; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; padding: 14px 28px; text-decoration: none; }
  .footer { padding: 24px 40px; border-top: 1px solid #1c1917; }
  .footer-text { color: #44403c; font-size: 10px; line-height: 1.6; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">Legacy Athlete</div>
    <h1 class="headline">WELCOME TO<br>THE PROGRAM.</h1>
    <div class="badge">✓ Account Created</div>
  </div>
  <div class="body-section">
    <p class="greeting">Hey ${name}, you're in. Your Legacy Athlete account is set up and ready. Here's how to get started:</p>
    <div class="step-row"><span class="step-num">01</span><span class="step-text">Browse available training sessions and book your first drop-in session.</span></div>
    <div class="step-row"><span class="step-num">02</span><span class="step-text">Choose a monthly plan that fits your training goals and commitment level.</span></div>
    <div class="step-row" style="border-bottom:none;"><span class="step-num">03</span><span class="step-text">Show up, work hard, and trust the process. Results follow consistency.</span></div>
  </div>
  <div class="cta-section">
    <p style="color:#a8a29e;font-size:13px;margin:0 0 20px;">Your athlete dashboard gives you a full view of your upcoming sessions, booking history, and training schedule.</p>
    <p style="color:#57534e;font-size:11px;margin:0;">Questions? Reach us at <a href="mailto:${COACH_EMAIL}" style="color:#ea580c;">${COACH_EMAIL}</a></p>
  </div>
  <div class="footer">
    <p class="footer-text">© Legacy Athlete. You're receiving this because you just created an account.<br>Your login: ${email}</p>
  </div>
</div>
</body>
</html>`;
}

function buildPlanPurchaseEmail(email: string, planName: string, amount: number, transactionId: string, addons: string[], is8Week: boolean): string {
  const addonLines = addons.length > 0 ? addons.map(a => `<div class="detail-row"><span class="detail-label">Add-on</span><span class="detail-value">${a}</span></div>`).join("") : "";
  const durationLabel = is8Week ? "8-Week Bundle (2 Months)" : "Monthly";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Plan Confirmed – Legacy Athlete</title>
<style>
  body { margin: 0; padding: 0; background: #000; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .container { max-width: 560px; margin: 0 auto; background: #0a0a0a; border: 1px solid #1c1917; }
  .header { background: #000; padding: 40px 40px 24px; border-bottom: 1px solid #1c1917; }
  .logo { font-size: 11px; letter-spacing: 0.4em; color: #ea580c; text-transform: uppercase; margin-bottom: 8px; }
  .headline { font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -0.02em; line-height: 1.2; margin: 0; }
  .badge { display: inline-block; background: #ea580c; color: #fff; font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; padding: 4px 12px; margin-top: 16px; }
  .body-section { padding: 32px 40px; }
  .greeting { color: #a8a29e; font-size: 14px; margin-bottom: 20px; }
  .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #1c1917; }
  .detail-label { font-size: 10px; color: #57534e; text-transform: uppercase; letter-spacing: 0.15em; }
  .detail-value { font-size: 13px; color: #fff; font-weight: 600; text-align: right; }
  .plan-badge { font-size: 11px; color: #ea580c; text-transform: uppercase; letter-spacing: 0.1em; }
  .amount { font-size: 18px; color: #22c55e; font-weight: 700; }
  .cta-section { padding: 24px 40px 32px; background: #111; border-top: 1px solid #1c1917; }
  .footer { padding: 24px 40px; border-top: 1px solid #1c1917; }
  .footer-text { color: #44403c; font-size: 10px; line-height: 1.6; }
  .mono { font-family: monospace; color: #57534e; font-size: 10px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">Legacy Athlete</div>
    <h1 class="headline">ENROLLMENT<br>CONFIRMED.</h1>
    <div class="badge">✓ Payment Received</div>
  </div>
  <div class="body-section">
    <p class="greeting">Your plan is active. Here's your receipt:</p>
    <div class="detail-row"><span class="detail-label">Plan</span><span class="detail-value plan-badge">${planName}</span></div>
    ${addonLines}
    <div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${durationLabel}</span></div>
    <div class="detail-row"><span class="detail-label">Amount Paid</span><span class="detail-value amount">$${amount.toFixed(2)}</span></div>
    <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span></div>
    <div class="detail-row" style="border-bottom:none;"><span class="detail-label">Transaction ID</span><span class="mono">${transactionId}</span></div>
  </div>
  <div class="cta-section">
    <p style="color:#a8a29e;font-size:13px;margin:0 0 12px;">You now have full access to your athlete dashboard. Book your sessions and start your training protocol.</p>
    <p style="color:#57534e;font-size:11px;margin:0;">Questions? Contact us at <a href="mailto:${COACH_EMAIL}" style="color:#ea580c;">${COACH_EMAIL}</a></p>
  </div>
  <div class="footer">
    <p class="footer-text">© Legacy Athlete. This receipt was sent to ${email} upon successful plan enrollment.</p>
  </div>
</div>
</body>
</html>`;
}

function buildCoachPlanEmail(userEmail: string, planName: string, amount: number, transactionId: string, addons: string[], is8Week: boolean): string {
  const addonText = addons.length > 0 ? addons.join(", ") : "None";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8">
<style>
  body { margin:0; background:#000; font-family:'Helvetica Neue',Arial,sans-serif; }
  .c { max-width:560px; margin:0 auto; background:#0a0a0a; border:1px solid #1c1917; }
  .h { background:#111; padding:32px 40px; border-bottom:1px solid #1c1917; }
  .tag { font-size:9px; letter-spacing:0.4em; color:#ea580c; text-transform:uppercase; }
  h1 { font-size:22px; color:#fff; margin:8px 0 0; }
  .b { padding:32px 40px; }
  .row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #1c1917; }
  .lbl { font-size:10px; color:#57534e; text-transform:uppercase; letter-spacing:0.15em; }
  .val { font-size:13px; color:#fff; font-weight:600; }
  .mono { font-family:monospace; font-size:11px; color:#78716c; word-break:break-all; }
  .f { padding:20px 40px; border-top:1px solid #1c1917; }
  .f p { color:#44403c; font-size:10px; }
</style>
</head>
<body>
<div class="c">
  <div class="h"><div class="tag">💳 New Plan Purchase</div><h1>Athlete Enrolled in Plan</h1></div>
  <div class="b">
    <div class="row"><span class="lbl">Athlete Email</span><span class="val">${userEmail}</span></div>
    <div class="row"><span class="lbl">Plan</span><span class="val" style="color:#ea580c;">${planName}</span></div>
    <div class="row"><span class="lbl">Add-ons</span><span class="val">${addonText}</span></div>
    <div class="row"><span class="lbl">Duration</span><span class="val">${is8Week ? "8-Week Bundle (2 Months)" : "Monthly"}</span></div>
    <div class="row"><span class="lbl">Amount</span><span class="val" style="color:#22c55e;">$${amount.toFixed(2)}</span></div>
    <div class="row"><span class="lbl">Date</span><span class="val">${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span></div>
    <div class="row" style="border-bottom:none;"><span class="lbl">Transaction ID</span><span class="mono">${transactionId}</span></div>
  </div>
  <div class="f"><p>Legacy Athlete Plan System — Auto-generated notification.</p></div>
</div>
</body>
</html>`;
}

function buildCancellationEmail(athleteName: string, sessionDate: Date, focus: string): string {
  const dateStr = format(toZonedTime(sessionDate, CST_TIMEZONE), "EEEE, MMMM do, yyyy");
  const timeStr = format(toZonedTime(sessionDate, CST_TIMEZONE), "h:mm a") + " CST";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8">
<style>
  body { margin:0; background:#000; font-family:'Helvetica Neue',Arial,sans-serif; }
  .c { max-width:560px; margin:0 auto; background:#0a0a0a; border:1px solid #1c1917; }
  .h { padding:32px 40px; border-bottom:1px solid #1c1917; }
  .logo { font-size:11px; letter-spacing:0.4em; color:#ea580c; text-transform:uppercase; }
  h1 { color:#fff; font-size:22px; margin:8px 0 0; }
  .b { padding:32px 40px; }
  .row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #1c1917; }
  .lbl { font-size:10px; color:#57534e; text-transform:uppercase; }
  .val { font-size:13px; color:#fff; font-weight:600; }
  .f { padding:20px 40px; border-top:1px solid #1c1917; }
  .f p { color:#44403c; font-size:10px; }
</style>
</head>
<body>
<div class="c">
  <div class="h"><div class="logo">Legacy Athlete</div><h1>Booking Cancelled</h1></div>
  <div class="b">
    <p style="color:#a8a29e;font-size:14px;">Hi ${athleteName}, your booking has been cancelled.</p>
    <div class="row"><span class="lbl">Session</span><span class="val">${dateStr}</span></div>
    <div class="row"><span class="lbl">Time</span><span class="val">${timeStr}</span></div>
    <div class="row" style="border-bottom:none;"><span class="lbl">Focus</span><span class="val" style="color:#ea580c;">${focus}</span></div>
    <p style="color:#a8a29e;font-size:13px;margin-top:16px;">The slot is now available. Rebook anytime at our website.</p>
  </div>
  <div class="f"><p>© Legacy Athlete · Questions? ${COACH_EMAIL}</p></div>
</div>
</body>
</html>`;
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Removed manual setCorsHeaders in favor of cors package

// ─── FUNCTION 0: exchangeCalendarToken ────────────────────────────────────────
// Called by Admin Panel after user approves Google Calendar OAuth.
// Receives the authorization code, exchanges it for refresh + access tokens,
// and persists them in Firestore settings/calendar_auth.
export const exchangeCalendarToken = functions.https.onRequest((req, res) => {
  applyCors(req, res, async () => {
    if (req.method !== "POST" && req.method !== "OPTIONS") { res.status(405).json({ error: "Method not allowed" }); return; }

    // Admin only
    const adminDecoded = await verifyAdminToken(req);
    if (!adminDecoded) { res.status(403).json({ error: "Forbidden: admin access required" }); return; }

    const { code, redirectUri: clientRedirectUri } = req.body;
    if (!code) { res.status(400).json({ error: "Missing authorization code" }); return; }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      res.status(500).json({ error: "Google OAuth client not configured on server" }); return;
    }

    const appBaseUrl = process.env.APP_BASE_URL || "https://legacyathlete.fit";
    // Prefer the redirectUri sent by the client (allows localhost dev), fall back to production URL
    const redirectUri = clientRedirectUri || `${appBaseUrl}/oauth/callback`;

    try {
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        // refresh_token is only returned on first authorization.
        // If it's missing, the admin needs to revoke app access and re-authorize.
        res.status(400).json({
          error: "No refresh token returned. Please revoke app access in Google Account settings and try again.",
          help: "https://myaccount.google.com/permissions",
        });
        return;
      }

      // Store in Firestore so Cloud Functions can read it
      await db.collection("settings").doc("calendar_auth").set({
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        expiry_date: tokens.expiry_date,
        scope: tokens.scope,
        connected_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({
        success: true,
        message: "Google Calendar connected successfully. Events will now be auto-created on each booking.",
      });
    } catch (error: any) {
      console.error("exchangeCalendarToken error:", error);
      res.status(500).json({ error: "Failed to exchange token", details: error.message });
    }
  });
});

// ─── FUNCTION 0b: getCalendarStatus ──────────────────────────────────────────
// Admin panel polls this to show connection status.
export const getCalendarStatus = functions.https.onRequest((req, res) => {
  applyCors(req, res, async () => {
    // Admin only
    const adminDecoded = await verifyAdminToken(req);
    if (!adminDecoded) { res.status(403).json({ error: "Forbidden: admin access required" }); return; }

    try {
      const settingsDoc = await db.collection("settings").doc("calendar_auth").get();
      if (settingsDoc.exists && settingsDoc.data()?.refresh_token) {
        const data = settingsDoc.data()!;
        res.json({
          connected: true,
          connectedAt: data.connected_at?.toDate()?.toISOString() || null,
          scope: data.scope || null,
        });
      } else {
        res.json({ connected: false });
      }
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch status" });
    }
  });
});

// ─── FUNCTION 1: getSessions ──────────────────────────────────────────────────
export const getSessions = functions.https.onRequest((req, res) => {
  applyCors(req, res, async () => {

    try {
      const nowCST = toZonedTime(new Date(), CST_TIMEZONE);
      const todayCST = startOfDay(nowCST);
      const sessions: any[] = [];

      const scheduleData = await loadScheduleFromFirestore();

      for (let i = 0; i < 14; i++) {
        const currentDateCST = addDays(todayCST, i);
        const dayOfWeek = currentDateCST.getDay();
        const daySchedule = scheduleData.find((s) => s.day === dayOfWeek);

        if (daySchedule) {
          for (const time of daySchedule.times) {
            const sessionDateCST = setMinutes(setHours(currentDateCST, time.h), time.m);
            const sessionDateUTC = fromZonedTime(sessionDateCST, CST_TIMEZONE);

            if (isAfter(sessionDateUTC, new Date())) {
              const endDateUTC = new Date(sessionDateUTC.getTime() + time.duration * 60 * 1000);
              const sessionId = sessionDateUTC.toISOString();
              const encodedId = encodeURIComponent(sessionId);

              // Per-instance override (cancel / edit a single occurrence)
              const overrideDoc = await db.collection("session_overrides").doc(encodedId).get();
              const override = overrideDoc.exists ? (overrideDoc.data() as any) : null;
              if (override?.cancelled) continue;

              const focus = override?.focus || time.focus;
              const duration = typeof override?.duration === "number" ? override.duration : time.duration;
              const effectiveEnd = new Date(sessionDateUTC.getTime() + duration * 60 * 1000);

              const sessionDoc = await db.collection("sessions").doc(encodedId).get();
              const bookedCount = sessionDoc.exists ? (sessionDoc.data()?.bookedCount || 0) : 0;
              const maxAttendance = typeof override?.maxAttendance === "number" ? override.maxAttendance : MAX_ATTENDANCE;

              sessions.push({
                id: sessionId,
                date: format(toZonedTime(sessionDateUTC, CST_TIMEZONE), "EEEE, MMM do"),
                time: `${format(toZonedTime(sessionDateUTC, CST_TIMEZONE), "h:mm a")} – ${format(toZonedTime(effectiveEnd, CST_TIMEZONE), "h:mm a")} CST`,
                focus,
                duration,
                spotsAvailable: Math.max(0, maxAttendance - bookedCount),
                isFull: bookedCount >= maxAttendance,
                coach: override?.coach || "MW",
              });
            }
          }
        }
      }

      res.json(sessions);
    } catch (error: any) {
      console.error("getSessions error:", error);
      res.status(500).json({ error: "Failed to fetch sessions", details: error.message });
    }
  });
});

// ─── Pricing (server-authoritative) ──────────────────────────────────────────
const SESSION_PRICE_CENTS = 4900; // $49 — drop-in session booking fee

const PLAN_PRICES_CENTS: Record<string, number> = {
  "drop-in":          2250,   // $22.50
  "1x-week":         17900,   // $179
  "2x-week":         25900,   // $259
  "3x-week":         30900,   // $309
  "4x-week":         35900,   // $359
  "performance-solo":  9900,  // $99
  "camp-weekly":     24900,   // $249
  "camp-early-bird": 22900,   // $229
  "camp-day-pass":    6500,   // $65
};

const PERFORMANCE_ADDON_CENTS: Record<string, number> = {
  "drop-in":  3500, // $35
  "default":  7900, // $79
};

/**
 * Compute the authoritative charge amount in cents.
 * Reads pricing from the Firestore `packages` collection if present,
 * otherwise falls back to the hardcoded PLAN_PRICES_CENTS map.
 * Mirrors the UI calculation but is the only version Stripe trusts.
 */
async function calculatePlanAmountCents(planId: string, addPerformance: boolean, is8Week: boolean): Promise<number> {
  let base = PLAN_PRICES_CENTS[planId];
  let perfDropIn = PERFORMANCE_ADDON_CENTS["drop-in"];
  let perfDefault = PERFORMANCE_ADDON_CENTS["default"];

  try {
    const pkgDoc = await db.collection("packages").doc(planId).get();
    if (pkgDoc.exists) {
      const data = pkgDoc.data() as any;
      if (typeof data.priceCents === "number") base = data.priceCents;
    }
    const perfDoc = await db.collection("packages").doc("performance-addon-config").get();
    if (perfDoc.exists) {
      const d = perfDoc.data() as any;
      if (typeof d.dropInCents === "number") perfDropIn = d.dropInCents;
      if (typeof d.defaultCents === "number") perfDefault = d.defaultCents;
    }
  } catch (e) {
    console.warn("[pricing] Firestore lookup failed, using fallback:", e);
  }

  if (!base) throw new Error(`Unknown plan: ${planId}`);
  const perf = (addPerformance && planId !== "performance-solo")
    ? (planId === "drop-in" ? perfDropIn : perfDefault)
    : 0;
  const months = (is8Week && planId !== "drop-in") ? 2 : 1;
  const subtotal = (base + perf) * months;
  const discount = (is8Week && planId !== "drop-in") ? Math.round(subtotal * 0.10) : 0;
  const afterDiscount = subtotal - discount;
  const tax = Math.round(afterDiscount * 0.1025); // IL 10.25% sales tax
  return afterDiscount + tax;
}

/**
 * Verify a Firebase ID token from the Authorization header.
 * Returns the decoded token or null if missing / invalid.
 */
async function verifyFirebaseToken(req: any): Promise<admin.auth.DecodedIdToken | null> {
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    return await admin.auth().verifyIdToken(authHeader.split("Bearer ")[1]);
  } catch {
    return null;
  }
}

/**
 * Verify a Firebase ID token AND require the admin custom claim.
 */
async function verifyAdminToken(req: any): Promise<admin.auth.DecodedIdToken | null> {
  const decoded = await verifyFirebaseToken(req);
  if (!decoded || decoded.admin !== true) return null;
  return decoded;
}

// ─── Input validation helpers ─────────────────────────────────────────────────
function isValidEmail(email: string): boolean {
  return typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function sanitizeName(name: string): string {
  return String(name).trim().replace(/[<>"'&]/g, "").slice(0, 100);
}

function isValidHexToken(str: string): boolean {
  // SHA-256 hex digest = 64 lowercase hex chars
  return typeof str === "string" && /^[0-9a-f]{64}$/i.test(str);
}

// ─── Secure cancellation token helpers ───────────────────────────────────────
/**
 * Hash a raw token with SHA-256. The hash is stored in Firestore;
 * the raw token is only ever sent in the cancellation email URL.
 */
function hashCancellationToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

// ─── Rate limiting (Firestore-based, per key) ─────────────────────────────────
/**
 * Returns false if the key has exceeded maxRequests within windowSeconds.
 * Uses a Firestore transaction to count requests in a sliding window.
 */
async function checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const ref = db.collection("rate_limits").doc(key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100));

  try {
    return await db.runTransaction(async (tx) => {
      const docSnap = await tx.get(ref);
      const requests: number[] = ((docSnap.data()?.requests || []) as number[])
        .filter((t) => t > windowStart);

      if (requests.length >= maxRequests) return false;

      requests.push(now);
      tx.set(ref, { requests, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return true;
    });
  } catch (e) {
    console.error("[rate_limit] Error:", e);
    return true; // fail open to avoid blocking legitimate requests on DB errors
  }
}

// ─── Audit logging ────────────────────────────────────────────────────────────
async function auditLog(
  action: string,
  actorId: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await db.collection("audit_log").add({
      action,
      actorId,
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("[audit] Failed to write audit log:", e);
  }
}

// ─── FUNCTION 2: createPaymentIntent ─────────────────────────────────────────
export const createPaymentIntent = functions.https.onRequest((req, res) => {
  applyCors(req, res, async () => {
    if (req.method !== "POST" && req.method !== "OPTIONS") { res.status(405).json({ error: "Method not allowed" }); return; }

    // ── Auth required ────────────────────────────────────────────────────────
    const decoded = await verifyFirebaseToken(req);
    if (!decoded) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { type, planId, addPerformance = false, is8Week = false, sessionId, athleteName } = req.body;

    try {
      const stripe = initStripe();
      let amount: number;
      let metadata: Record<string, string>;

      if (type === "booking") {
        // Session booking — price is always SESSION_PRICE_CENTS, server-defined
        if (!sessionId || !athleteName) {
          res.status(400).json({ error: "sessionId and athleteName are required for bookings" }); return;
        }
        amount = SESSION_PRICE_CENTS;
        metadata = {
          type:        "booking",
          sessionId:   String(sessionId),
          athleteName: String(athleteName).slice(0, 100), // cap length
          email:       decoded.email || "",
          userId:      decoded.uid,
        };

      } else if (type === "plan") {
        // Plan / subscription purchase — price calculated server-side
        if (!planId) { res.status(400).json({ error: "planId is required for plan purchases" }); return; }
        try {
          amount = await calculatePlanAmountCents(String(planId), Boolean(addPerformance), Boolean(is8Week));
        } catch {
          res.status(400).json({ error: "Invalid plan configuration" }); return;
        }
        metadata = {
          type:          "plan",
          planId:        String(planId),
          addPerformance: String(addPerformance),
          is8Week:       String(is8Week),
          email:         decoded.email || "",
          userId:        decoded.uid,
        };

      } else {
        res.status(400).json({ error: "type must be 'booking' or 'plan'" }); return;
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata,
      });

      // Return server-calculated amount so the client can display the authoritative total
      res.json({ clientSecret: paymentIntent.client_secret, amount });
    } catch (error: any) {
      console.error("createPaymentIntent error:", error);
      res.status(500).json({ error: error.message });
    }
  });
});

// ─── FUNCTION 3: createBooking ────────────────────────────────────────────────
export const createBooking = functions.https.onRequest((req, res) => {
  applyCors(req, res, async () => {
    if (req.method !== "POST" && req.method !== "OPTIONS") { res.status(405).json({ error: "Method not allowed" }); return; }

    // ── Auth required ────────────────────────────────────────────────────────
    const decoded = await verifyFirebaseToken(req);
    if (!decoded) { res.status(401).json({ error: "Unauthorized" }); return; }

    // ── Rate limiting: max 5 booking attempts per user per 10 minutes ────────
    const allowed = await checkRateLimit(`booking:${decoded.uid}`, 5, 600);
    if (!allowed) { res.status(429).json({ error: "Too many requests. Please try again later." }); return; }

    const { sessionId, athleteName, email, paymentIntentId, focus } = req.body;
    const focusInput = focus || "Training Session";

    // ── Input validation ─────────────────────────────────────────────────────
    if (!sessionId || !athleteName || !email || !paymentIntentId) {
      res.status(400).json({ error: "Missing required fields" }); return;
    }
    if (!isValidEmail(String(email))) {
      res.status(400).json({ error: "Invalid email address" }); return;
    }
    if (String(athleteName).trim().length < 2) {
      res.status(400).json({ error: "Athlete name too short" }); return;
    }
    const safeAthleteName = sanitizeName(String(athleteName));
    console.log("createBooking started for:", safeAthleteName, decoded.email);

    // Init Stripe before try so it's available in catch for refunds
    const stripe = initStripe();

    try {
      // 1. Verify Stripe payment
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== "succeeded") {
        res.status(402).json({ error: "Payment not completed. Status: " + paymentIntent.status }); return;
      }

      // ── Amount integrity check — prevents a $1 PI being used for a $49 booking ──
      if (paymentIntent.amount !== SESSION_PRICE_CENTS) {
        console.error(`Amount mismatch: PI has ${paymentIntent.amount}, expected ${SESSION_PRICE_CENTS}`);
        res.status(402).json({ error: "Payment amount does not match session fee" }); return;
      }

      // ── Idempotency: return existing booking if this PI was already used ────
      const existingQuery = await db.collection("bookings")
        .where("payment_intent_id", "==", paymentIntentId).limit(1).get();
      if (!existingQuery.empty) {
        const existing = existingQuery.docs[0].data();
        console.log("Booking already exists for PI:", paymentIntentId);
        res.json({ success: true, bookingId: existing.id, message: "Booking already confirmed" });
        return;
      }

      // 2. Transactional booking (race-condition safe)
      const sessionDocRef = db.collection("sessions").doc(encodeURIComponent(sessionId));
      let bookingId = "";
      let cancellationToken = "";
      let sessionDate: Date = new Date();
      let endDate: Date = new Date();
      let sessionFocus = "";

      // Load schedule outside the transaction (Firestore reads inside txns must come before writes)
      const SCHEDULE = await loadScheduleFromFirestore();

      await db.runTransaction(async (transaction) => {
        const sessionDoc = await transaction.get(sessionDocRef);
        const sessionData = sessionDoc.exists ? sessionDoc.data()! : { bookedCount: 0 };
        const bookedCount = sessionData.bookedCount || 0;

        if (bookedCount >= MAX_ATTENDANCE) throw new Error("SESSION_FULL");

        sessionDate = new Date(decodeURIComponent(sessionId));
        if (isNaN(sessionDate.getTime())) throw new Error("INVALID_SESSION_ID");

        const cstDate = toZonedTime(sessionDate, CST_TIMEZONE);
        const dayOfWeek = cstDate.getDay();
        const hours = cstDate.getHours();
        const minutes = cstDate.getMinutes();

        const daySchedule = SCHEDULE.find((s) => s.day === dayOfWeek);
        const timeSlot = daySchedule?.times.find((t) => t.h === hours && t.m === minutes);
        const duration = timeSlot?.duration || 60;
        sessionFocus = timeSlot?.focus || focusInput;
        endDate = new Date(sessionDate.getTime() + duration * 60 * 1000);

        bookingId = uuidv4();
        // Raw token goes into the cancellation email URL; only the hash is stored in DB
        cancellationToken = uuidv4(); // raw — sent to athlete
        const cancellationTokenHash = hashCancellationToken(cancellationToken);

        transaction.set(db.collection("bookings").doc(bookingId), {
          id: bookingId,
          session_id: sessionId,
          athlete_name: safeAthleteName,
          email: String(email).toLowerCase().trim(),
          user_id: decoded.uid,
          booked_at: admin.firestore.FieldValue.serverTimestamp(),
          cancellation_token_hash: cancellationTokenHash, // only hash stored, never plaintext
          payment_status: "paid",
          payment_intent_id: paymentIntentId,
          calendar_event_id: "",
          focus: sessionFocus,
          session_date: admin.firestore.Timestamp.fromDate(sessionDate),
          end_date: admin.firestore.Timestamp.fromDate(endDate),
        });

        transaction.set(sessionDocRef, {
          id: sessionId,
          date: admin.firestore.Timestamp.fromDate(sessionDate),
          coach: "MW",
          focus: sessionFocus,
          bookedCount: bookedCount + 1,
          isBooked: bookedCount + 1 >= MAX_ATTENDANCE,
          last_updated: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      });

      // 3. Google Calendar (service account — shared calendar)
      let calendarEventId = "";
      const calendar = initCalendarWithServiceAccount();
      if (calendar) {
        try {
          const sharedCalId = await getOrCreateSharedCalendarId();
          const event = await calendar.events.insert({
            calendarId: sharedCalId,
            sendUpdates: "none",
            requestBody: {
              summary: `${safeAthleteName} has booked ${sessionFocus}`,
              description: `Athlete: ${safeAthleteName}\nEmail: ${String(email).toLowerCase().trim()}\nFocus: ${sessionFocus}\nDate: ${format(toZonedTime(sessionDate, CST_TIMEZONE), "EEEE, MMMM do, yyyy")}\nTime: ${format(toZonedTime(sessionDate, CST_TIMEZONE), "h:mm a")} – ${format(toZonedTime(endDate, CST_TIMEZONE), "h:mm a")} CST\nBooking ID: ${bookingId}`,
              start: { dateTime: sessionDate.toISOString(), timeZone: CST_TIMEZONE },
              end: { dateTime: endDate.toISOString(), timeZone: CST_TIMEZONE },
              colorId: "6",
              reminders: { useDefault: false, overrides: [{ method: "email", minutes: 24 * 60 }, { method: "popup", minutes: 60 }] },
            },
          });
          calendarEventId = event.data.id || "";
          await db.collection("bookings").doc(bookingId).update({ calendar_event_id: calendarEventId });
        } catch (calErr) {
          console.error("Calendar error (non-fatal):", calErr);
        }
      }

      // 4. Emails
      const safeEmail = String(email).toLowerCase().trim();
      const resend = initResend();
      const icsContent = generateICS(sessionDate, endDate, safeAthleteName, sessionFocus, bookingId);
      const icsBase64 = Buffer.from(icsContent).toString("base64");

      await resend.emails.send({
        from: "Legacy Athlete <bookings@legacyathlete.fit>",
        to: [safeEmail],
        subject: `✅ Session Confirmed – ${format(toZonedTime(sessionDate, CST_TIMEZONE), "EEEE, MMM do")}`,
        html: buildAthleteEmail(safeAthleteName, sessionDate, endDate, sessionFocus, bookingId, cancellationToken),
        attachments: [{ filename: "session.ics", content: icsBase64 }],
      });

      await resend.emails.send({
        from: "Legacy Athlete Bookings <bookings@legacyathlete.fit>",
        to: [COACH_EMAIL],
        subject: `🔔 New Booking: ${safeAthleteName} – ${format(toZonedTime(sessionDate, CST_TIMEZONE), "MMM do h:mm a")} CST`,
        html: buildCoachEmail(safeAthleteName, safeEmail, sessionDate, sessionFocus, sessionId, bookingId, "PAID", calendarEventId),
      });

      await auditLog("booking_created", decoded.uid, { bookingId, sessionId, email: safeEmail });
      res.json({ success: true, bookingId, calendarEventCreated: !!calendarEventId, message: "Booking confirmed!" });
    } catch (error: any) {
      console.error("createBooking error:", error);
      if (error.message === "SESSION_FULL") {
        // ── Auto-refund when payment was captured but no slot is available ────
        try {
          await stripe.refunds.create({ payment_intent: paymentIntentId, reason: "duplicate" });
          res.status(409).json({ error: "Session is fully booked. Your payment has been automatically refunded." });
        } catch (refundErr: any) {
          console.error("Refund failed:", refundErr.message);
          res.status(409).json({ error: "Session is fully booked. Please contact us for a refund." });
        }
      } else {
        res.status(500).json({ error: "Booking failed", details: error.message });
      }
    }
  });
});

// ─── FUNCTION 4: cancelBooking ────────────────────────────────────────────────
export const cancelBooking = functions.https.onRequest((req, res) => {
  applyCors(req, res, async () => {
    if (req.method !== "POST" && req.method !== "OPTIONS") { res.status(405).json({ error: "Method not allowed" }); return; }

    const { cancellationToken } = req.body;
    if (!cancellationToken || typeof cancellationToken !== "string") {
      res.status(400).json({ error: "Missing cancellation token" }); return;
    }

    // ── Rate limiting: max 10 cancellation attempts per token per hour ────────
    const tokenKey = `cancel:${cancellationToken.slice(0, 32)}`;
    const allowed = await checkRateLimit(tokenKey, 10, 3600);
    if (!allowed) { res.status(429).json({ error: "Too many requests. Please try again later." }); return; }

    try {
      // ── Look up booking by hashed token ────────────────────────────────────
      const hashedToken = hashCancellationToken(cancellationToken);
      const bookingQuery = await db.collection("bookings")
        .where("cancellation_token_hash", "==", hashedToken).limit(1).get();

      if (bookingQuery.empty) { res.status(404).json({ error: "Invalid or expired cancellation token" }); return; }

      const bookingDoc = bookingQuery.docs[0];
      const booking = bookingDoc.data();

      // ── 24-hour cancellation window enforcement ───────────────────────────
      const sessionDate = booking.session_date?.toDate() || new Date(decodeURIComponent(booking.session_id));
      const hoursUntilSession = (sessionDate.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilSession < 24) {
        res.status(400).json({
          error: "Cancellations must be made at least 24 hours before the session.",
          sessionDate: sessionDate.toISOString(),
        });
        return;
      }

      // Delete calendar event from shared calendar
      if (booking.calendar_event_id) {
        const calendar = initCalendarWithServiceAccount();
        if (calendar) {
          try {
            const sharedCalId = await getOrCreateSharedCalendarId();
            await calendar.events.delete({ calendarId: sharedCalId, eventId: booking.calendar_event_id });
          } catch (calErr) { console.error("Calendar delete error (non-fatal):", calErr); }
        }
      }

      // Transactional delete + free slot
      const sessionDocRef = db.collection("sessions").doc(encodeURIComponent(booking.session_id));
      await db.runTransaction(async (transaction) => {
        const sessionDoc = await transaction.get(sessionDocRef);
        const newCount = Math.max(0, ((sessionDoc.exists ? sessionDoc.data()?.bookedCount : 1) || 1) - 1);
        transaction.delete(bookingDoc.ref);
        transaction.set(sessionDocRef, { bookedCount: newCount, isBooked: false, last_updated: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      });

      // Send cancellation email
      const resend = initResend();
      await resend.emails.send({
        from: "Legacy Athlete <bookings@legacyathlete.fit>",
        to: [booking.email],
        subject: `Booking Cancelled – ${format(toZonedTime(sessionDate, CST_TIMEZONE), "MMM do")}`,
        html: buildCancellationEmail(booking.athlete_name, sessionDate, booking.focus || "Training Session"),
      });

      await auditLog("booking_cancelled", booking.user_id || "unknown", {
        bookingId: booking.id,
        sessionId: booking.session_id,
        email: booking.email,
      });
      res.json({ success: true, message: "Booking cancelled. Email sent." });
    } catch (error: any) {
      console.error("cancelBooking error:", error);
      res.status(500).json({ error: "Cancellation failed", details: error.message });
    }
  });
});

// ─── FUNCTION 5: confirmPlanPurchase ─────────────────────────────────────────
// Called from frontend after a successful Stripe plan payment.
// Verifies the payment intent with Stripe, records the purchase in Firestore,
// then sends a receipt to the athlete and a notification to the coach.
export const confirmPlanPurchase = functions.https.onRequest((req, res) => {
  applyCors(req, res, async () => {
    if (req.method !== "POST" && req.method !== "OPTIONS") { res.status(405).json({ error: "Method not allowed" }); return; }

    // ── Auth required ────────────────────────────────────────────────────────
    const decoded = await verifyFirebaseToken(req);
    if (!decoded) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { email, planName, amount, transactionId, addons = [], is8Week = false } = req.body;
    if (!email || !planName || !amount || !transactionId) {
      res.status(400).json({ error: "Missing required fields: email, planName, amount, transactionId" }); return;
    }

    // Ensure the authenticated user's email matches the purchase email
    if (decoded.email && decoded.email.toLowerCase() !== String(email).toLowerCase()) {
      res.status(403).json({ error: "Email does not match authenticated account" }); return;
    }

    try {
      // ── Verify the payment intent with Stripe ─────────────────────────────
      const stripe = initStripe();
      const paymentIntent = await stripe.paymentIntents.retrieve(transactionId);
      if (paymentIntent.status !== "succeeded") {
        res.status(402).json({ error: "Payment not confirmed by Stripe. Status: " + paymentIntent.status }); return;
      }

      // ── Idempotency: don't send duplicate emails / re-record the purchase ─
      const purchaseRef = db.collection("plan_purchases").doc(transactionId);
      const existingPurchase = await purchaseRef.get();
      if (existingPurchase.exists) {
        console.log("Plan purchase already recorded for PI:", transactionId);
        res.json({ success: true, message: "Plan already confirmed" });
        return;
      }

      // ── Record the purchase in Firestore ──────────────────────────────────
      await purchaseRef.set({
        paymentIntentId: transactionId,
        userId:    decoded.uid,
        email:     String(email).toLowerCase().trim(),
        planName:  String(planName),
        amount:    paymentIntent.amount, // use Stripe's authoritative amount
        addons,
        is8Week:   Boolean(is8Week),
        purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
        status:    "confirmed",
      });

      const resend = initResend();
      const authorativeAmount = paymentIntent.amount / 100; // cents → dollars

      // Athlete receipt
      await resend.emails.send({
        from: "Legacy Athlete <bookings@legacyathlete.fit>",
        to: [String(email).toLowerCase().trim()],
        subject: `✅ Enrollment Confirmed – ${planName}`,
        html: buildPlanPurchaseEmail(String(email).toLowerCase().trim(), planName, authorativeAmount, transactionId, addons, Boolean(is8Week)),
      });

      // Coach notification
      await resend.emails.send({
        from: "Legacy Athlete Plans <bookings@legacyathlete.fit>",
        to: [COACH_EMAIL],
        subject: `💳 New Plan Purchase: ${email} – ${planName}`,
        html: buildCoachPlanEmail(String(email).toLowerCase().trim(), planName, authorativeAmount, transactionId, addons, Boolean(is8Week)),
      });

      res.json({ success: true, message: "Plan purchase emails sent." });
    } catch (error: any) {
      console.error("confirmPlanPurchase error:", error);
      res.status(500).json({ error: "Failed to process plan purchase", details: error.message });
    }
  });
});

// ─── FUNCTION 6: checkCancellation ───────────────────────────────────────────
export const checkCancellation = functions.https.onRequest((req, res) => {
  applyCors(req, res, async () => {

    const { token } = req.query;
    if (!token || typeof token !== "string") { res.status(400).json({ error: "Missing token" }); return; }

    // ── Rate limiting: max 20 check attempts per token per hour ──────────────
    const tokenKey = `check:${token.slice(0, 32)}`;
    const allowed = await checkRateLimit(tokenKey, 20, 3600);
    if (!allowed) { res.status(429).json({ error: "Too many requests." }); return; }

    try {
      const hashedToken = hashCancellationToken(token);
      const bookingQuery = await db.collection("bookings")
        .where("cancellation_token_hash", "==", hashedToken).limit(1).get();

      if (bookingQuery.empty) { res.status(404).json({ error: "Invalid or expired token" }); return; }

      const booking = bookingQuery.docs[0].data();
      const sessionDate = booking.session_date?.toDate() || new Date(decodeURIComponent(booking.session_id));
      const hoursUntilSession = (sessionDate.getTime() - Date.now()) / (1000 * 60 * 60);

      res.json({
        valid: true,
        athleteName: booking.athlete_name,
        focus: booking.focus,
        date: format(toZonedTime(sessionDate, CST_TIMEZONE), "EEEE, MMMM do, yyyy"),
        time: format(toZonedTime(sessionDate, CST_TIMEZONE), "h:mm a") + " CST",
        bookingId: booking.id,
        canCancel: hoursUntilSession >= 24,
        hoursUntilSession: Math.round(hoursUntilSession),
      });
    } catch (error: any) {
      console.error("checkCancellation error:", error);
      res.status(500).json({ error: "Failed to check token" });
    }
  });
});

// ─── FUNCTION 7: getSharedCalendarEvents ─────────────────────────────────────
// Returns all events from the shared Google Calendar for the next 3 months.
// Called by both admin and user dashboards for the unified calendar view.
export const getSharedCalendarEvents = functions.https.onRequest((req, res) => {
  applyCors(req, res, async () => {
    // Require authentication (admin or regular user) to view calendar events
    const decoded = await verifyFirebaseToken(req);
    if (!decoded) { res.status(401).json({ error: "Unauthorized" }); return; }

    try {
      const calendar = initCalendarWithServiceAccount();
      if (!calendar) {
        res.status(503).json({ error: "Calendar service not configured" });
        return;
      }

      const calendarId = await getOrCreateSharedCalendarId();

      // Fetch 3 months back through 4 months forward
      const now = new Date();
      const timeMin = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
      const timeMax = new Date(now.getFullYear(), now.getMonth() + 4, 0).toISOString();

      const response = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 1000,
      });

      const events = (response.data.items || []).map((e) => ({
        id: e.id,
        summary: e.summary || "Event",
        description: e.description || "",
        start: e.start,
        end: e.end,
        colorId: e.colorId || "1",
        status: e.status || "confirmed",
        created: e.created,
        updated: e.updated,
      }));

      res.json({ events, calendarId });
    } catch (error: any) {
      console.error("getSharedCalendarEvents error:", error);
      res.status(500).json({ error: "Failed to fetch calendar events", details: error.message });
    }
  });
});

// ─── FUNCTION 8: getSharedCalendarId ─────────────────────────────────────────
// Returns the shared calendar ID so the frontend can use it for embeds.
export const getSharedCalendarIdEndpoint = functions.https.onRequest((req, res) => {
  applyCors(req, res, async () => {
    try {
      const calendarId = await getOrCreateSharedCalendarId();
      res.json({ calendarId });
    } catch (error: any) {
      console.error("getSharedCalendarId error:", error);
      res.status(500).json({ error: error.message });
    }
  });
});

// ─── FUNCTION: stripeWebhook ──────────────────────────────────────────────────
// Stripe calls this endpoint directly — no CORS wrapper, no auth header.
// Signature verification via STRIPE_WEBHOOK_SECRET is the only trust mechanism.
//
// Handles:
//   payment_intent.succeeded   → idempotent booking/plan fulfillment fallback
//   payment_intent.payment_failed → log failures for admin review
//   charge.dispute.created     → flag disputed transactions for admin action
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("[webhook] Missing stripe-signature header or STRIPE_WEBHOOK_SECRET env var");
    res.status(400).send("Webhook misconfigured");
    return;
  }

  let event: Stripe.Event;
  try {
    const stripe = initStripe();
    // Firebase Functions preserves req.rawBody (Buffer) before any body parsing
    event = stripe.webhooks.constructEvent(
      (req as any).rawBody as Buffer,
      sig as string,
      webhookSecret
    );
  } catch (err: any) {
    console.error("[webhook] Signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {

      // ── payment_intent.succeeded ───────────────────────────────────────────
      // Primary fulfillment safety net. The client normally calls createBooking /
      // confirmPlanPurchase directly, so we check idempotency before acting.
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log(`[webhook] payment_intent.succeeded: ${pi.id}`);

        const { type, planId, addPerformance, is8Week, sessionId, athleteName, email, userId } = pi.metadata;

        // ── Idempotency gate ─────────────────────────────────────────────────
        const processedRef = db.collection("processed_payments").doc(pi.id);
        const alreadyProcessed = await processedRef.get();
        if (alreadyProcessed.exists) {
          console.log(`[webhook] ${pi.id} already processed — skipping`);
          break;
        }
        await processedRef.set({
          type:        type || "unknown",
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        if (type === "booking") {
          // Check if the client-side createBooking already ran
          const bookingQuery = await db.collection("bookings")
            .where("payment_intent_id", "==", pi.id).limit(1).get();

          if (bookingQuery.empty && sessionId && athleteName && email) {
            // Fallback: webhook arrived before or instead of the client call — create booking now
            console.log(`[webhook] Creating booking as fallback for PI ${pi.id}`);
            const stripe2 = initStripe();
            const sessionDocRef = db.collection("sessions").doc(encodeURIComponent(sessionId));

            let bookingId = "";
            let cancellationToken = "";
            let sessionDate: Date = new Date();
            let endDate: Date = new Date();
            let sessionFocus = "";

            const SCHEDULE = await loadScheduleFromFirestore();
            try {
              await db.runTransaction(async (tx) => {
                const sessionDoc = await tx.get(sessionDocRef);
                const bookedCount = (sessionDoc.exists ? sessionDoc.data()?.bookedCount : 0) || 0;
                if (bookedCount >= MAX_ATTENDANCE) throw new Error("SESSION_FULL");

                sessionDate = new Date(decodeURIComponent(sessionId));
                const cstDate = toZonedTime(sessionDate, CST_TIMEZONE);
                const daySchedule = SCHEDULE.find((s) => s.day === cstDate.getDay());
                const timeSlot = daySchedule?.times.find((t) => t.h === cstDate.getHours() && t.m === cstDate.getMinutes());
                const duration = timeSlot?.duration || 60;
                sessionFocus = timeSlot?.focus || "Training Session";
                endDate = new Date(sessionDate.getTime() + duration * 60 * 1000);
                bookingId = uuidv4();
                cancellationToken = uuidv4(); // raw — goes in email URL
                const webhookTokenHash = hashCancellationToken(cancellationToken);

                tx.set(db.collection("bookings").doc(bookingId), {
                  id: bookingId, session_id: sessionId, athlete_name: sanitizeName(athleteName),
                  email: email.toLowerCase(), user_id: userId || "",
                  booked_at: admin.firestore.FieldValue.serverTimestamp(),
                  cancellation_token_hash: webhookTokenHash, payment_status: "paid",
                  payment_intent_id: pi.id, calendar_event_id: "",
                  focus: sessionFocus,
                  session_date: admin.firestore.Timestamp.fromDate(sessionDate),
                  end_date: admin.firestore.Timestamp.fromDate(endDate),
                  created_by: "webhook",
                });
                tx.set(sessionDocRef, {
                  bookedCount: bookedCount + 1,
                  isBooked: bookedCount + 1 >= MAX_ATTENDANCE,
                  last_updated: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
              });

              // Calendar + emails (best-effort)
              const calendar = initCalendarWithServiceAccount();
              let calendarEventId = "";
              if (calendar) {
                try {
                  const calId = await getOrCreateSharedCalendarId();
                  const ev = await calendar.events.insert({
                    calendarId: calId, sendUpdates: "none",
                    requestBody: {
                      summary: `${athleteName} has booked ${sessionFocus}`,
                      start: { dateTime: sessionDate.toISOString(), timeZone: CST_TIMEZONE },
                      end: { dateTime: endDate.toISOString(), timeZone: CST_TIMEZONE },
                      colorId: "6",
                    },
                  });
                  calendarEventId = ev.data.id || "";
                  await db.collection("bookings").doc(bookingId).update({ calendar_event_id: calendarEventId });
                } catch (calErr) { console.error("[webhook] Calendar error:", calErr); }
              }

              const resend = initResend();
              const ics = generateICS(sessionDate, endDate, athleteName, sessionFocus, bookingId);
              await resend.emails.send({
                from: "Legacy Athlete <bookings@legacyathlete.fit>",
                to: [email.toLowerCase()],
                subject: `✅ Session Confirmed – ${format(toZonedTime(sessionDate, CST_TIMEZONE), "EEEE, MMM do")}`,
                html: buildAthleteEmail(athleteName, sessionDate, endDate, sessionFocus, bookingId, cancellationToken),
                attachments: [{ filename: "session.ics", content: Buffer.from(ics).toString("base64") }],
              });
              await resend.emails.send({
                from: "Legacy Athlete Bookings <bookings@legacyathlete.fit>",
                to: [COACH_EMAIL],
                subject: `🔔 New Booking (webhook): ${athleteName} – ${format(toZonedTime(sessionDate, CST_TIMEZONE), "MMM do h:mm a")} CST`,
                html: buildCoachEmail(athleteName, email, sessionDate, sessionFocus, sessionId, bookingId, "PAID", calendarEventId),
              });
            } catch (txErr: any) {
              if (txErr.message === "SESSION_FULL") {
                // Session full — refund
                try { await stripe2.refunds.create({ payment_intent: pi.id, reason: "duplicate" }); } catch {}
              }
              console.error("[webhook] Fallback booking failed:", txErr.message);
            }
          }

        } else if (type === "plan") {
          // Check if confirmPlanPurchase already ran
          const planRef = db.collection("plan_purchases").doc(pi.id);
          const existingPlan = await planRef.get();
          if (!existingPlan.exists && email) {
            console.log(`[webhook] Recording plan purchase as fallback for PI ${pi.id}`);
            await planRef.set({
              paymentIntentId: pi.id,
              userId:    userId || "",
              email:     email.toLowerCase(),
              planId:    planId || "",
              amount:    pi.amount,
              addPerformance: addPerformance === "true",
              is8Week:   is8Week === "true",
              purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
              status:    "confirmed",
              created_by: "webhook",
            });
          }
        }
        break;
      }

      // ── payment_intent.payment_failed ──────────────────────────────────────
      // Log failures for admin visibility; the Stripe Dashboard also tracks these.
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn(`[webhook] payment_intent.payment_failed: ${pi.id}`);
        await db.collection("payment_failures").add({
          paymentIntentId: pi.id,
          errorCode:    pi.last_payment_error?.code || null,
          errorMessage: pi.last_payment_error?.message || null,
          metadata:     pi.metadata,
          amount:       pi.amount,
          currency:     pi.currency,
          failedAt:     admin.firestore.FieldValue.serverTimestamp(),
        });
        break;
      }

      // ── charge.dispute.created ─────────────────────────────────────────────
      // A chargeback has been filed. Flag the associated transaction so admin
      // can respond in the Stripe Dashboard before the deadline.
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const piId = typeof dispute.payment_intent === "string"
          ? dispute.payment_intent
          : (dispute.payment_intent as any)?.id || "";
        console.warn(`[webhook] charge.dispute.created: ${dispute.id} on PI ${piId}`);

        await db.collection("disputes").add({
          disputeId:       dispute.id,
          paymentIntentId: piId,
          reason:          dispute.reason,
          status:          dispute.status,
          amountCents:     dispute.amount,
          currency:        dispute.currency,
          evidenceDueBy:   dispute.evidence_details?.due_by
            ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
            : null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Notify admin by email
        try {
          const resend = initResend();
          await resend.emails.send({
            from: "Legacy Athlete Alerts <bookings@legacyathlete.fit>",
            to: [COACH_EMAIL],
            subject: `⚠️ Chargeback Filed – $${(dispute.amount / 100).toFixed(2)} – Action Required`,
            html: `<p>A chargeback has been filed for Payment Intent <b>${piId}</b>.<br>
                   Amount: <b>$${(dispute.amount / 100).toFixed(2)}</b><br>
                   Reason: <b>${dispute.reason}</b><br>
                   Evidence due by: <b>${dispute.evidence_details?.due_by
                     ? new Date(dispute.evidence_details.due_by * 1000).toLocaleDateString()
                     : "unknown"}</b><br><br>
                   Respond in the <a href="https://dashboard.stripe.com/disputes/${dispute.id}">Stripe Dashboard</a>.</p>`,
          });
        } catch (emailErr) { console.error("[webhook] Dispute email failed:", emailErr); }
        break;
      }

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }
  } catch (handlerErr: any) {
    console.error(`[webhook] Handler error for ${event.type}:`, handlerErr.message);
  }

  // Always return 200 — Stripe retries on non-2xx responses
  res.json({ received: true });
});

// ─── FUNCTION: setAdminClaim ──────────────────────────────────────────────────
// Bootstrap function to grant or revoke the `admin` Firebase custom claim.
// Protected by ADMIN_BOOTSTRAP_SECRET env var — never expose this secret.
// Usage: POST { "secret": "...", "targetEmail": "coach@...", "isAdmin": true }
export const setAdminClaim = functions.https.onRequest((req, res) => {
  applyCors(req, res, async () => {
    if (req.method !== "POST" && req.method !== "OPTIONS") { res.status(405).json({ error: "Method not allowed" }); return; }

    const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!bootstrapSecret) {
      res.status(500).json({ error: "Admin bootstrap secret not configured on server" }); return;
    }

    const { secret, targetEmail, isAdmin: makeAdmin } = req.body;

    if (!secret || typeof secret !== "string" || secret !== bootstrapSecret) {
      res.status(403).json({ error: "Invalid bootstrap secret" }); return;
    }
    if (!targetEmail || !isValidEmail(String(targetEmail))) {
      res.status(400).json({ error: "Valid targetEmail required" }); return;
    }

    try {
      const userRecord = await admin.auth().getUserByEmail(String(targetEmail));
      const grantAdmin = makeAdmin !== false; // default true if not specified
      await admin.auth().setCustomUserClaims(userRecord.uid, { admin: grantAdmin });
      await auditLog("set_admin_claim", "system_bootstrap", {
        targetEmail: String(targetEmail),
        targetUid: userRecord.uid,
        admin: grantAdmin,
      });
      console.log(`[setAdminClaim] ${grantAdmin ? "Granted" : "Revoked"} admin claim for ${targetEmail}`);
      res.json({ success: true, uid: userRecord.uid, admin: grantAdmin });
    } catch (error: any) {
      console.error("[setAdminClaim] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
});

// ─── FUNCTION: adminGrantPackage ──────────────────────────────────────────────
// Admin-only. Manually assigns a package to a user by email (for cash
// purchases that don't go through Stripe). Supports an optional percentage
// discount, the 8-week bundle, and the performance add-on. Records the grant
// in `plan_purchases` so it surfaces in the user's dashboard exactly like a
// paid plan, and emails both the athlete and the coach.
export const adminGrantPackage = functions.https.onRequest({ invoker: "public" }, (req, res) => {
  applyCors(req, res, async () => {
    if (req.method !== "POST" && req.method !== "OPTIONS") { res.status(405).json({ error: "Method not allowed" }); return; }

    const adminDecoded = await verifyAdminToken(req);
    if (!adminDecoded) { res.status(403).json({ error: "Forbidden: admin access required" }); return; }

    const {
      email,
      packageId,
      discountPercent = 0,
      addPerformance = false,
      is8Week = false,
      paymentMethod = "cash",
      notes = "",
      sendEmail = true,
    } = req.body || {};

    if (!email || !packageId) {
      res.status(400).json({ error: "Missing required fields: email, packageId" }); return;
    }
    if (!isValidEmail(String(email))) {
      res.status(400).json({ error: "Invalid email address" }); return;
    }
    const discount = Number(discountPercent) || 0;
    if (discount < 0 || discount > 100) {
      res.status(400).json({ error: "discountPercent must be between 0 and 100" }); return;
    }

    try {
      // ── Load package (server-authoritative pricing) ──────────────────────
      const pkgDoc = await db.collection("packages").doc(String(packageId)).get();
      let planName = String(packageId);
      let base = PLAN_PRICES_CENTS[String(packageId)];
      if (pkgDoc.exists) {
        const data = pkgDoc.data() as any;
        if (data.name) planName = data.name;
        if (typeof data.priceCents === "number") base = data.priceCents;
      }
      if (!base) { res.status(400).json({ error: `Unknown package: ${packageId}` }); return; }

      // ── Performance add-on lookup ────────────────────────────────────────
      let perfDropIn = PERFORMANCE_ADDON_CENTS["drop-in"];
      let perfDefault = PERFORMANCE_ADDON_CENTS["default"];
      try {
        const perfDoc = await db.collection("packages").doc("performance-addon-config").get();
        if (perfDoc.exists) {
          const d = perfDoc.data() as any;
          if (typeof d.dropInCents === "number") perfDropIn = d.dropInCents;
          if (typeof d.defaultCents === "number") perfDefault = d.defaultCents;
        }
      } catch {}

      const perf = (addPerformance && packageId !== "performance-solo")
        ? (packageId === "drop-in" ? perfDropIn : perfDefault)
        : 0;
      const months = (is8Week && packageId !== "drop-in") ? 2 : 1;
      const subtotal = (base + perf) * months;
      const eightWeekDiscount = (is8Week && packageId !== "drop-in") ? Math.round(subtotal * 0.10) : 0;
      const afterEightWeek = subtotal - eightWeekDiscount;
      const manualDiscountCents = Math.round(afterEightWeek * discount / 100);
      const finalAmount = afterEightWeek - manualDiscountCents;

      // ── Look up user by email (optional — record either way) ─────────────
      const safeEmail = String(email).toLowerCase().trim();
      let targetUid: string | null = null;
      try {
        const userRecord = await admin.auth().getUserByEmail(safeEmail);
        targetUid = userRecord.uid;
      } catch {
        targetUid = null; // user can claim grant once they sign up under this email
      }

      // ── Persist grant ───────────────────────────────────────────────────
      const grantId = `manual_${uuidv4()}`;
      const addons = (addPerformance && packageId !== "performance-solo") ? ["Performance Add-on"] : [];

      await db.collection("plan_purchases").doc(grantId).set({
        paymentIntentId: grantId,
        userId: targetUid,
        email: safeEmail,
        planName,
        packageId: String(packageId),
        amount: finalAmount,
        baseAmount: subtotal,
        eightWeekDiscount,
        discountPercent: discount,
        discountAmount: manualDiscountCents,
        addons,
        is8Week: Boolean(is8Week),
        addPerformance: Boolean(addPerformance),
        paymentMethod: String(paymentMethod || "cash"),
        notes: String(notes || "").slice(0, 500),
        grantedByAdmin: adminDecoded.email || adminDecoded.uid,
        purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "confirmed",
        manualGrant: true,
      });

      // ── Email notifications ─────────────────────────────────────────────
      if (sendEmail !== false) {
        try {
          const resend = initResend();
          const amountDollars = finalAmount / 100;
          await resend.emails.send({
            from: "Legacy Athlete <bookings@legacyathlete.fit>",
            to: [safeEmail],
            subject: `✅ Plan Activated – ${planName}`,
            html: buildPlanPurchaseEmail(safeEmail, planName, amountDollars, grantId, addons, Boolean(is8Week)),
          });
          await resend.emails.send({
            from: "Legacy Athlete Plans <bookings@legacyathlete.fit>",
            to: [COACH_EMAIL],
            subject: `📒 Manual Grant: ${safeEmail} – ${planName}${discount ? ` (${discount}% off)` : ""}`,
            html: buildCoachPlanEmail(
              safeEmail,
              `${planName}${discount ? ` (${discount}% off)` : ""}`,
              amountDollars,
              grantId,
              addons,
              Boolean(is8Week),
            ),
          });
        } catch (emailErr: any) {
          console.error("[adminGrantPackage] Email send failed (non-fatal):", emailErr.message);
        }
      }

      await auditLog("manual_package_grant", adminDecoded.uid, {
        grantId,
        targetEmail: safeEmail,
        targetUid,
        packageId,
        planName,
        subtotal,
        eightWeekDiscount,
        discountPercent: discount,
        manualDiscountCents,
        finalAmount,
        is8Week,
        addPerformance,
        paymentMethod,
      });

      res.json({
        success: true,
        grantId,
        userFound: targetUid !== null,
        targetUid,
        planName,
        subtotal,
        eightWeekDiscount,
        discountAmount: manualDiscountCents,
        finalAmount,
      });
    } catch (error: any) {
      console.error("adminGrantPackage error:", error);
      res.status(500).json({ error: "Failed to grant package", details: error.message });
    }
  });
});

// ─── FUNCTION: adminRevokePackage ─────────────────────────────────────────────
// Admin-only. Revokes a previously-issued manual grant by its grantId.
// Only manual grants (manualGrant == true) can be revoked through this endpoint —
// Stripe purchases must be refunded through Stripe, not deleted here.
export const adminRevokePackage = functions.https.onRequest({ invoker: "public" }, (req, res) => {
  applyCors(req, res, async () => {
    if (req.method !== "POST" && req.method !== "OPTIONS") { res.status(405).json({ error: "Method not allowed" }); return; }

    const adminDecoded = await verifyAdminToken(req);
    if (!adminDecoded) { res.status(403).json({ error: "Forbidden: admin access required" }); return; }

    const { grantId } = req.body || {};
    if (!grantId || typeof grantId !== "string") {
      res.status(400).json({ error: "Missing grantId" }); return;
    }

    try {
      const ref = db.collection("plan_purchases").doc(grantId);
      const snap = await ref.get();
      if (!snap.exists) { res.status(404).json({ error: "Grant not found" }); return; }
      const data = snap.data() as any;
      if (data.manualGrant !== true) {
        res.status(400).json({ error: "Only manual grants can be revoked via this endpoint" }); return;
      }

      await ref.update({
        status: "revoked",
        revokedAt: admin.firestore.FieldValue.serverTimestamp(),
        revokedByAdmin: adminDecoded.email || adminDecoded.uid,
      });

      await auditLog("manual_package_revoke", adminDecoded.uid, {
        grantId,
        targetEmail: data.email,
        targetUid: data.userId,
        packageId: data.packageId,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("adminRevokePackage error:", error);
      res.status(500).json({ error: "Failed to revoke grant", details: error.message });
    }
  });
});

// ─── AUTH TRIGGER: sendWelcomeEmail ──────────────────────────────────────────
// Fires automatically whenever a new Firebase Auth user is created.
// Sends a welcome email to the new athlete.
export const sendWelcomeEmail = functionsV1.auth.user().onCreate(async (user) => {
  const email = user.email;
  if (!email) {
    console.log("[sendWelcomeEmail] No email on new user, skipping.");
    return;
  }
  const displayName = user.displayName || undefined;
  try {
    const resend = initResend();
    await resend.emails.send({
      from: "Legacy Athlete <bookings@legacyathlete.fit>",
      to: [email.toLowerCase().trim()],
      subject: "Welcome to Legacy Athlete — You're In.",
      html: buildWelcomeEmail(email.toLowerCase().trim(), displayName),
    });
    console.log(`[sendWelcomeEmail] Welcome email sent to ${email}`);
  } catch (error: any) {
    console.error("[sendWelcomeEmail] Failed to send welcome email:", error.message);
  }
});
