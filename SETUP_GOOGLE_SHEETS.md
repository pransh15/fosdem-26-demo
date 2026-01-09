# Google Sheets Feedback Integration Setup

This guide will help you set up Google Sheets to receive feedback submissions from your FOSDEM demo booth.

## Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it **"FOSDEM 2026 Feedback"**
4. Add these column headers in row 1:
   - **A1**: `Timestamp`
   - **B1**: `Video ID`
   - **C1**: `Video Title`
   - **D1**: `Sentiment`
   - **E1**: `Comment`
   - **F1**: `Contact Consent`
   - **G1**: `Email`

## Step 2: Create the Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete any default code
3. Copy and paste this code:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    // Append row with feedback data
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.videoId || '',
      data.videoTitle || '',
      data.sentiment || '',
      data.comment || '',
      data.contactConsent || '',
      data.email || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Click **💾 Save** (or Ctrl+S / Cmd+S)
5. Name your project: **"FOSDEM Feedback Collector"**

## Step 3: Deploy as Web App

1. Click **Deploy → New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**
4. Configure the deployment:
   - **Description**: "FOSDEM Feedback Collector"
   - **Execute as**: **Me** (your account)
   - **Who has access**: **Anyone** ⚠️ (This is required!)
5. Click **Deploy**
6. You may need to:
   - Click **Authorize access**
   - Choose your Google account
   - Click **Advanced** → **Go to [Project name] (unsafe)**
   - Click **Allow**
7. **Copy the Web app URL** (looks like: `https://script.google.com/macros/s/.../exec`)

## Step 4: Update Your Website

1. Open `app.js` in your project
2. Find this line near the top:
   ```javascript
   GOOGLE_SCRIPT_URL: 'YOUR_GOOGLE_SCRIPT_URL_HERE'
   ```
3. Replace `YOUR_GOOGLE_SCRIPT_URL_HERE` with your Web app URL from Step 3

Example:
```javascript
const CONFIG = {
    STORAGE_KEY: 'mozilla_fosdem2026_feedback',
    CHAR_LIMIT: 500,
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz.../exec'
};
```

## Step 5: Test It!

1. Deploy your website to Vercel or run it locally
2. Open a demo video and submit feedback
3. Check your Google Sheet - a new row should appear!

## Privacy & Legal Notes

✅ **Benefits of Google Sheets:**
- You control where the data lives (your Google account)
- Can easily share with Mozilla legal team
- No complex database setup
- Can set sharing permissions (view-only for stakeholders)
- Easy to export as CSV/Excel
- GDPR-friendly if using EU Google Workspace

⚠️ **Important:**
- Make sure the Google Account you use complies with Mozilla's data policies
- Consider using a Mozilla Google Workspace account if available
- You can restrict sheet access after deployment (just keep the Apps Script public)

## Accessing Your Data

### View in Real-Time
Just open your Google Sheet - data appears instantly as people submit feedback.

### Export Data
1. In Google Sheets: **File → Download → CSV** or **Excel**
2. Or use Google Sheets API for automated exports

### Share with Team
1. Click **Share** in Google Sheets
2. Add team members' emails
3. Set permissions (Viewer/Editor)

## Troubleshooting

**Feedback not appearing?**
- Check browser console for errors
- Verify the `GOOGLE_SCRIPT_URL` is correct in app.js
- Make sure Apps Script deployment is set to "Anyone" access
- Check if you authorized the script properly

**Need to update the script?**
1. Make changes in Apps Script editor
2. Click **Deploy → Manage deployments**
3. Click ✏️ Edit on your deployment
4. Change version to "New version"
5. Click **Deploy**
6. URL stays the same - no need to update app.js!

## Security Notes

- The Apps Script URL is public but only accepts POST requests
- No authentication is required (by design, for public booth use)
- Rate limiting is handled by Google Apps Script (6 minutes/execution)
- Data is stored in your private Google Sheet (not public unless you share it)

## Questions?

Contact the Mozilla legal/privacy team before collecting user data at FOSDEM!