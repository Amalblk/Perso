// app/api/submit-form/route.js
import { google } from "googleapis";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

// For CORS: allow requests from your Framer site
const ALLOWED_ORIGINS = ["https://amaltairou.framer.website"];

export async function POST(req) {
  try {
    const origin = req.headers.get("origin");
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return NextResponse.json(
        { ok: false, message: "Origin not allowed" },
        { status: 403 }
      );
    }

    const body = await req.json();
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
      return NextResponse.json(
        { ok: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Env vars
    const {
      GOOGLE_SERVICE_ACCOUNT,
      SPREADSHEET_ID,
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      MY_EMAIL,
    } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT || !SPREADSHEET_ID)
      throw new Error("Missing Google Sheets config");
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MY_EMAIL)
      throw new Error("Missing SMTP config");

    // ===== 1) Append to Google Sheet =====
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

    // ===== 2) Send email =====
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

    return NextResponse.json({ ok: true, message: "Saved & emailed" }, { status: 200 });
  } catch (error) {
    console.error("submit-form error:", error);
    return NextResponse.json(
      { ok: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}

// ===== OPTIONS handler for CORS preflight =====
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.join(","),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
