import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import admin from "firebase-admin";
import { readFileSync } from "fs";

// ✅ Initialize Firebase Admin SDK using file path from .env
if (!admin.apps.length) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!serviceAccountPath) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not defined in .env");
  }

  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const otpStore = new Map<string, string>(); // temporary in-memory OTP storage

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, otp);

    // Setup Gmail transport
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send email with OTP
    await transporter.sendMail({
      from: `"APULA System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your APULA Verification Code",
      html: `
        <h2>Your verification code</h2>
        <p style="font-size:20px"><strong>${otp}</strong></p>
        <p>This code will expire in 5 minutes.</p>
      `,
    });

    console.log(`✅ OTP sent to ${email}: ${otp}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error sending OTP:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}

// Helper function for OTP verification
export function verifyOtp(email: string, otp: string) {
  return otpStore.get(email) === otp;
}
