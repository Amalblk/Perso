// api/submit-form.js
import { google } from "googleapis";
import nodemailer from "nodemailer";

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "https://amaltairou.framer.website"); // 👈 safer than *
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCORS(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const body = req.body || {};
  const {
    service,
    name,
    email,
    description,
    pages,
    projectType,
    budget,
    deadline,
  } = body;

  if (!service || !name || !email) {
    return res
      .status(400)
      .json({ ok: false, message: "Missing required fields" });
  }

  const {
    GOOGLE_SERVICE_ACCOUNT,
    SPREADSHEET_ID,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    MY_EMAIL,
  } = process.env;

  if (!GOOGLE_SERVICE_ACCOUNT || !SPREADSHEET_ID) {
    return res
      .status(500)
      .json({ ok: false, message: "Missing Google Sheets config" });
  }
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MY_EMAIL) {
    return res
      .status(500)
      .json({ ok: false, message: "Missing SMTP config" });
  }

  try {
    // 1) Google Sheets
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(GOOGLE_SERVICE_ACCOUNT),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A1",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            new Date().toISOString(),
            service,
            name,
            email,
            description || "",
            pages || "",
            projectType || "",
            budget || "",
            deadline || "",
          ],
        ],
      },
    });

    // 2) Email
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const subject = `New ${service} submission — ${name}`;
    const text = `
New form submission
Service: ${service}
Name: ${name}
Email: ${email}
Description: ${description || "-"}
Pages: ${pages || "-"}
Project Type: ${projectType || "-"}
Budget: ${budget || "-"}
Deadline: ${deadline || "-"}
`;

    await transporter.sendMail({
      from: `"Form" <${SMTP_USER}>`,
      to: MY_EMAIL,
      subject,
      text,
    });

    return res.status(200).json({ ok: true, message: "Saved & emailed" });
  } catch (error) {
    console.error("submit-form error:", error);
    return res
      .status(500)
      .json({ ok: false, message: "Server error", error: error.message });
  }
}
