import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { sendTelegram } from '@/lib/telegram';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Authenticate
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Prepare Data based on Source
    // Columns: [Date, FirstName, LastName, Email, Phone, Budget, Goal, Timeline, Source, InterestedProject]
    const row = [
        new Date().toLocaleString(),
        body.firstName || "N/A", 
        body.lastName || "",
        body.email,
        body.phone ? `'${body.countryCode || ''} ${body.phone}` : "N/A",
        body.budget || "N/A",
        body.goal || "N/A",       
        body.timeline || "N/A",
        body.source || "Contact Form", 
        body.interestedProject || "General Inquiry" // <--- NEW: Captures the Project Name!
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:J', // <--- NEW: Extended range to Column J
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row], 
      },
    });

    await sendTelegram(
`🔔 <b>NEW LEAD</b>

👤 ${body.firstName || ''} ${body.lastName || ''}
📧 ${body.email}
📱 ${body.countryCode || ''} ${body.phone || 'N/A'}
💰 Budget: ${body.budget || 'N/A'}
🎯 Goal: ${body.goal || 'N/A'}
⏱ Timeline: ${body.timeline || 'N/A'}
🏢 Project: ${body.interestedProject || 'General Inquiry'}
📌 Source: ${body.source || 'Contact Form'}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Google Sheets Error:', error);
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }
}