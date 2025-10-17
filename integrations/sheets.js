// src/integrations/sheets.js
import { google } from 'googleapis';

function getAuth() {
  const sa = JSON.parse(process.env.GCP_SA_JSON);
  return new google.auth.GoogleAuth({
    credentials: sa,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function appendRows(rows) {
  const sheets = google.sheets({ version: 'v4', auth: await getAuth() });
  const spreadsheetId = process.env.SHEET_ID;
  const range = `${process.env.SHEET_TAB || 'Prices'}!A:Z`;
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });
}
