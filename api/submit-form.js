import { google } from "googleapis";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    const {
        service,
        name,
        email,
        description,
        pages,
        projectType,
        budget,
        deadline,
    } = req.body;

    // --- 1. Google Sheets setup ---
    const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Sheet1!A:H",
        valueInputOption: "RAW",
        requestBody: {
            values: [[service, name, email, description, pages, projectType, budget, deadline]],
        },
    });

    // --- 2. Email setup ---
    const nodemailer = require("nodemailer");

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    await transporter.sendMail({
        from: `"Form Submission" <${process.env.SMTP_USER}>`,
        to: process.env.MY_EMAIL,
        subject: `New submission from ${name}`,
        text: `
Service: ${service}
Name: ${name}
Email: ${email}
Description: ${description}
Pages: ${pages || "-"}
Project Type: ${projectType || "-"}
Budget: ${budget || "-"}
Deadline: ${deadline || "-"}
        `,
    });

    return res.status(200).json({ message: "Success" });
}
