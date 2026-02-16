import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // This appends the data as a new row
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:H', // Adjust based on your sheet name
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
            new Date().toLocaleString(), // Using toLocaleString() for easier reading in Sheets
            body.firstName,
            body.lastName,
            body.email,
            `'${body.countryCode} ${body.phone}`, // Added a single quote (') here
            body.budget,
            body.goal,
            body.timeline
        ]], 
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Google Sheets Error:', error);
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }
}