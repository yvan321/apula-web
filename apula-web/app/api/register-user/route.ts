// /app/api/register-user/route.ts
import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { readFileSync } from "fs";

if (!admin.apps.length) {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const serviceAccount = JSON.parse(readFileSync(path!, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export async function POST(req: Request) {
  try {
    const { email, password, name, contact, address, platform } = await req.json();

    if (!email || !password || !name || !contact || !address) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ✅ Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // ✅ Save to Firestore
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      email,
      name,
      contact,
      address,
      platform,
      verified: true,
      createdAt: new Date(),
      role: "user",
    });

    return NextResponse.json({ success: true, message: "User registered successfully" });
  } catch (err: any) {
    console.error("❌ Error creating user:", err);
    return NextResponse.json({ error: err.message || "Failed to register user" }, { status: 500 });
  }
}
