import { NextResponse } from "next/server";
import { verifyOtp } from "../send-otp/route";

export async function POST(req: Request) {
  const { email, otp } = await req.json();
  if (!email || !otp)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const isValid = verifyOtp(email, otp);

  if (!isValid)
    return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });

  return NextResponse.json({ success: true });
}
