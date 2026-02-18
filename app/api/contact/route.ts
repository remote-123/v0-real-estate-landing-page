import { google } from 'googleapis';
import { NextResponse } from 'next/server';

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
    // Columns: [Date, FirstName, LastName, Email, Phone, Budget, Goal, Timeline, SOURCE]
    const row = [
        new Date().toLocaleString(),
        body.firstName || "N/A",  // Wizard/Popup might not have names
        body.lastName || "",
        body.email,
        body.phone ? `'${body.countryCode || ''} ${body.phone}` : "N/A",
        body.budget || "N/A",
        body.goal || "N/A",       // "Intent" from Wizard goes here
        body.timeline || "N/A",
        body.source || "Contact Form" // <--- NEW: Tracks where the lead came from
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:I', // Extended to Column I for Source
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row], 
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Google Sheets Error:', error);
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }
}