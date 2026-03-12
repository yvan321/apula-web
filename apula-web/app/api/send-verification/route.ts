import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "send-verification endpoint is running",
  });
}

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: "Email and code are required" },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "APULA Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color:#A30000;">APULA Email Verification</h2>
          <p>Your verification code is:</p>
          <div style="
            font-size: 28px;
            font-weight: bold;
            letter-spacing: 4px;
            color: #A30000;
            margin: 20px 0;
          ">
            ${code}
          </div>
          <p>Please enter this code in the APULA app to verify your responder account.</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully",
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to send verification email",
      },
      { status: 500 }
    );
  }
}