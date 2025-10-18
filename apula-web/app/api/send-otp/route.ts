import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const otpStore = new Map<string, string>(); // ⚠️ temporary in-memory store (for testing)

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
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

    // Send email
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

    console.log(`OTP sent to ${email}: ${otp}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}

// Helper (for OTP verification)
export function verifyOtp(email: string, otp: string) {
  return otpStore.get(email) === otp;
}
