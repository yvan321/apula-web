/**
 * sms_functions/index.js
 *
 * Firebase Functions (Gen 2) - PhilSMS integration
 *
 * - Sends SMS to responders who opted in (users.smsOptIn === true) using users.contact
 * - Trigger A: when a NEW dispatch doc is CREATED
 * - Trigger B: when a dispatch doc is UPDATED and status changes to "Dispatched"
 * - Has a manual HTTPS test endpoint: testSendSms
 *
 * SMS uses: dispatch.userAddress (or fallback: dispatch.alert?.userAddress, dispatch.alertLocation)
 */

const admin = require("firebase-admin");
const axios = require("axios");

const { logger } = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");

admin.initializeApp();

const PHILSMS_TOKEN = defineSecret("PHILSMS_TOKEN");
const PHILSMS_SENDER_ID = defineSecret("PHILSMS_SENDER_ID");

const PHILSMS_ENDPOINT = "https://dashboard.philsms.com/api/v3/sms/send";

/** Normalize PH numbers to 639xxxxxxxxx (no +) */
function normalizePHMobile(input) {
  if (!input) return null;

  let s = String(input).trim();
  s = s.replace(/[\s\-()]/g, "");

  if (s.startsWith("09") && s.length === 11) return "63" + s.slice(1);
  if (s.startsWith("+63") && s.length >= 13) return s.slice(1);
  if (s.startsWith("63") && s.length >= 12) return s;
  if (s.startsWith("9") && s.length === 10) return "63" + s;

  return null;
}

/** Remove non-ascii + compress whitespace (prevents SMS gateway failures) */
function toGsmPlain(text) {
  return String(text || "")
    .replace(/[^\x00-\x7F]/g, "") // strip emoji/unicode
    .replace(/\s+/g, " ")
    .trim();
}

/** Safe logger helper (never pass objects directly) */
function logJson(level, label, obj) {
  const text = `${label} ${JSON.stringify(obj)}`;
  if (level === "error") logger.error(text);
  else logger.info(text);
}

/** Build address (your request: alert->userAddress) with safe fallbacks */
function getFireAddress(dispatch) {
  return (
    dispatch?.alert?.userAddress ||
    dispatch?.userAddress ||
    dispatch?.alertLocation || // fallback if you still store this
    "Unknown location"
  );
}

/** Send SMS via PhilSMS */
async function sendPhilSms({ token, senderId, recipients, message }) {
  const sid = String(senderId || "").trim();

  // We send GSM-safe text => plain
  const payload = {
    recipient: recipients.join(","),
    type: "plain",
    message,
  };

  // include sender_id only if set
  if (sid) payload.sender_id = sid;

  const res = await axios.post(PHILSMS_ENDPOINT, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    timeout: 20000,
    validateStatus: () => true,
  });

  return { httpStatus: res.status, data: res.data, payloadSent: payload };
}

/**
 * Send personalized SMS to each opted-in responder in dispatch.responders[]
 * (one SMS per responder so we can say "Hi {name}")
 */
async function sendDispatchSmsToResponders(dispatch, dispatchId) {
  const responders = Array.isArray(dispatch?.responders) ? dispatch.responders : [];
  if (responders.length === 0) {
    logger.info("No responders in dispatch doc. Skipping SMS.");
    return;
  }

  const db = admin.firestore();
  const token = PHILSMS_TOKEN.value();
  const senderId = PHILSMS_SENDER_ID.value();

  const alertType = toGsmPlain(dispatch?.alertType || "Alert");
  const fireAddress = toGsmPlain(getFireAddress(dispatch));
  const dispatchedBy = toGsmPlain(dispatch?.dispatchedBy || "Admin Panel");

  // optional: avoid duplicates within same function run
  const seen = new Set();

  for (const r of responders) {
    const uid = r?.id;
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);

    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) continue;

    const user = snap.data();

    // must be responder + opted-in
    if (user?.role !== "responder" || user?.smsOptIn !== true || !user?.contact) continue;

    const phone = normalizePHMobile(user.contact);
    if (!phone) continue;

    const responderName = toGsmPlain(user?.name || "Responder");

    // ✅ Your requested format using userAddress
    const message = toGsmPlain(
  `APULA DISPATCH

Hi ${responderName},
You have been dispatched to:

${fireAddress}

Alert Type: ${alertType}
Dispatched By: ADMIN

- APULA System`
);

    logger.info(`Dispatch ${dispatchId} -> sending SMS to ${phone} (${responderName})`);
    logger.info(`DISPATCH smsText: ${message}`);

    const result = await sendPhilSms({
      token,
      senderId,
      recipients: [phone],
      message,
    });

    logJson("info", "PhilSMS payloadSent:", result.payloadSent);
    logger.info(`PhilSMS HTTP status: ${result.httpStatus}`);
    logJson("info", "PhilSMS raw response:", result.data);

    if (result?.data?.status !== "success") {
      logJson("error", "PhilSMS ERROR:", result.data);
    }
  }
}

/**
 * Trigger A: NEW dispatch created
 */
exports.onDispatchCreatedSendSms = onDocumentCreated(
  {
    document: "dispatches/{dispatchId}",
    secrets: [PHILSMS_TOKEN, PHILSMS_SENDER_ID],
    region: "us-central1",
  },
  async (event) => {
    const dispatchId = event.params.dispatchId;
    const dispatch = event.data?.data();

    logger.info(`SMS TRIGGER FIRED (created): ${dispatchId}`);

    if (!dispatch) {
      logger.info("No dispatch data found. Skipping.");
      return;
    }

    await sendDispatchSmsToResponders(dispatch, dispatchId);
  }
);

/**
 * Trigger B: dispatch updated -> status changes to Dispatched
 * Prevent duplicates with smsNotified flag
 */
exports.onDispatchUpdatedSendSms = onDocumentUpdated(
  {
    document: "dispatches/{dispatchId}",
    secrets: [PHILSMS_TOKEN, PHILSMS_SENDER_ID],
    region: "us-central1",
  },
  async (event) => {
    const dispatchId = event.params.dispatchId;
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) return;

    const beforeStatus = before.status || "";
    const afterStatus = after.status || "";

    // Only when status transitions to Dispatched
    if (!(beforeStatus !== "Dispatched" && afterStatus === "Dispatched")) return;

    if (after.smsNotified === true) {
      logger.info(`SMS already notified for dispatch: ${dispatchId}`);
      return;
    }

    logger.info(`SMS TRIGGER FIRED (updated->Dispatched): ${dispatchId}`);

    await sendDispatchSmsToResponders(after, dispatchId);

    // Mark as notified to prevent duplicates
    await event.data.after.ref.update({
      smsNotified: true,
      smsNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("smsNotified set to true");
  }
);

/**
 * Manual test endpoint:
 * https://us-central1-apula-36cee.cloudfunctions.net/testSendSms?to=09935573850
 */
exports.testSendSms = onRequest(
  {
    secrets: [PHILSMS_TOKEN, PHILSMS_SENDER_ID],
    region: "us-central1",
  },
  async (req, res) => {
    try {
      const to = String(req.query.to || "").trim();
      if (!to) return res.status(400).json({ ok: false, error: "Missing ?to=" });

      const phone = normalizePHMobile(to);
      if (!phone) return res.status(400).json({ ok: false, error: "Invalid phone format" });

      const result = await sendPhilSms({
        token: PHILSMS_TOKEN.value(),
        senderId: PHILSMS_SENDER_ID.value(),
        recipients: [phone],
        message: "APULA TEST SMS",
      });

      return res.status(200).json({
        ok: true,
        normalized: phone,
        payloadSent: result.payloadSent,
        httpStatus: result.httpStatus,
        philsms: result.data,
      });
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: e?.response?.data || e?.message || String(e),
      });
    }
  }
);