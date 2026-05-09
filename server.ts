import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { google } from 'googleapis';
import { addDays, setHours, setMinutes, startOfDay, isAfter, format } from 'date-fns';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Booking System Setup ---
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');

// Ensure bookings file exists
if (!fs.existsSync(BOOKINGS_FILE)) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify({}));
}

const getBookings = () => JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf-8'));
const saveBookings = (data: any) => fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(data, null, 2));

const MAX_ATTENDANCE = 12;

// Schedule definition
const SCHEDULE = [
  { day: 1, times: [{ h: 18, m: 30, focus: 'Speed & Agility (GS)', duration: 30 }, { h: 19, m: 0, focus: 'Total Skills/IQ/Gameplay (GS)', duration: 60 }] }, // Monday
  { day: 2, times: [{ h: 18, m: 30, focus: 'Strength + Power (GS)', duration: 30 }, { h: 19, m: 0, focus: 'Shooting (300+) (GS)', duration: 60 }] }, // Tuesday
  { day: 3, times: [{ h: 18, m: 30, focus: 'Mobility + Cond. (GS)', duration: 30 }, { h: 19, m: 0, focus: 'Ball Handling (GS)', duration: 60 }] }, // Wednesday
  { day: 4, times: [{ h: 18, m: 30, focus: 'Speed & Agility (GS)', duration: 30 }, { h: 19, m: 0, focus: 'Total Skills/IQ/Gameplay (GS)', duration: 60 }] }, // Thursday
  { day: 6, times: [{ h: 8, m: 0, focus: 'Select Practice (GS)', duration: 60 }, { h: 9, m: 0, focus: 'Strength + Power (GS)', duration: 30 }, { h: 9, m: 30, focus: 'Game prep: footwork and skills (GS)', duration: 60 }] }, // Saturday
];

// --- Google Calendar Setup ---
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
}

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Stripe
  let stripe: Stripe | null = null;
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
    });
  }

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // --- Booking Routes ---
  app.get('/api/sessions', (req, res) => {
    const bookings = getBookings();
    const sessions = [];
    const today = startOfDay(new Date());

    // Generate sessions for the next 14 days
    for (let i = 0; i < 14; i++) {
      const currentDate = addDays(today, i);
      const dayOfWeek = currentDate.getDay();
      
      const daySchedule = SCHEDULE.find(s => s.day === dayOfWeek);
      if (daySchedule) {
        daySchedule.times.forEach(time => {
          const sessionDate = setMinutes(setHours(currentDate, time.h), time.m);
          
          // Only show future sessions
          if (isAfter(sessionDate, new Date())) {
            const sessionId = sessionDate.toISOString();
            const currentBookings = bookings[sessionId] || [];
            const endDate = new Date(sessionDate.getTime() + (time.duration || 60) * 60 * 1000);
            
            sessions.push({
              id: sessionId,
              date: format(sessionDate, 'EEEE, MMM do'),
              time: `${format(sessionDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`,
              focus: time.focus,
              spotsAvailable: MAX_ATTENDANCE - currentBookings.length,
              isFull: currentBookings.length >= MAX_ATTENDANCE
            });
          }
        });
      }
    }

    res.json(sessions);
  });

  app.post('/api/bookings', async (req, res) => {
    const { sessionIds, name, email } = req.body;
    
    // Fallback for older clients that might still send sessionId
    const idsToBook = sessionIds || (req.body.sessionId ? [req.body.sessionId] : []);

    if (idsToBook.length === 0 || !name || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const bookings = getBookings();

    // 1. Validate all requested sessions first
    for (const id of idsToBook) {
      const sessionBookings = bookings[id] || [];
      if (sessionBookings.length >= MAX_ATTENDANCE) {
        return res.status(400).json({ error: 'One or more selected sessions are full' });
      }
      if (sessionBookings.some((b: any) => b.email === email)) {
        return res.status(400).json({ error: 'You have already booked one of these sessions' });
      }
    }

    // 2. Process all bookings
    let calendarSuccessCount = 0;
    
    for (const id of idsToBook) {
      const sessionBookings = bookings[id] || [];
      sessionBookings.push({ name, email, bookedAt: new Date().toISOString() });
      bookings[id] = sessionBookings;

      // Google Calendar Integration
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN) {
        try {
          const sessionDate = new Date(id);
          
          // Find duration
          const dayOfWeek = sessionDate.getDay();
          const hours = sessionDate.getHours();
          const minutes = sessionDate.getMinutes();
          
          let durationMinutes = 60; // default
          const daySchedule = SCHEDULE.find(s => s.day === dayOfWeek);
          if (daySchedule) {
            const timeSlot = daySchedule.times.find(t => t.h === hours && t.m === minutes);
            if (timeSlot && timeSlot.duration) {
              durationMinutes = timeSlot.duration;
            }
          }

          const endDate = new Date(sessionDate.getTime() + durationMinutes * 60 * 1000);

          await calendar.events.insert({
            calendarId: 'primary',
            sendUpdates: 'all',
            requestBody: {
              summary: `Legacy Training Session`,
              description: `Training session for ${name}.`,
              start: { dateTime: sessionDate.toISOString() },
              end: { dateTime: endDate.toISOString() },
              attendees: [{ email }],
              reminders: {
                useDefault: false,
                overrides: [
                  { method: 'email', minutes: 24 * 60 },
                  { method: 'popup', minutes: 60 },
                ],
              },
            },
          });
          calendarSuccessCount++;
        } catch (error) {
          console.error('Google Calendar Error:', error);
          // Continue even if calendar fails
        }
      }
    }

    saveBookings(bookings);

    res.json({ 
      success: true, 
      message: `Successfully booked ${idsToBook.length} session(s)`,
      calendarIntegration: calendarSuccessCount > 0 ? `${calendarSuccessCount} event(s) created` : 'Skipped (credentials missing or failed)'
    });
  });

  // --- Stripe Route ---
  app.post('/api/create-payment-intent', async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe is not configured (missing STRIPE_SECRET_KEY)' });
    }

    try {
      const { amount, currency = 'usd' } = req.body;
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error: any) {
      res.status(400).send({
        error: {
          message: error.message,
        },
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
