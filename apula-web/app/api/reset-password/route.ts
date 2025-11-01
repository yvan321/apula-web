import { NextResponse } from "next/server";
import admin from "firebase-admin";

// ✅ Initialize Firebase Admin with application default credentials
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

export async function POST(req: Request) {
  try {
    const { email, newPassword } = await req.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: "Email and new password are required" },
        { status: 400 }
      );
    }

    // ✅ Get the user by email
    const user = await admin.auth().getUserByEmail(email);

    // ✅ Update the user’s password
    await admin.auth().updateUser(user.uid, { password: newPassword });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🔥 Reset password error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
