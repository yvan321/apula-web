/**
 * sms_functions/index.js
 *
 * Gen2 Firebase Functions + PhilSMS
 *
 * ✅ Prevents credit drain:
 *  - per-dispatch per-responder dedupe using subcollection smsLogs
 *  - optional global kill switch SMS_ENABLED
 *  - smsNotified only after at least one SMS attempt (configurable)
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

// Keep your endpoint (change if you want)
const PHILSMS_ENDPOINT = "https://dashboard.philsms.com/api/v3/sms/send";

/**
 * ✅ Kill switch (no credits spent when false)
 * Set in firebase functions config / env:
 * SMS_ENABLED=false
 *
 * In Gen2 you can set env in firebase.json or CLI.
 */
const SMS_ENABLED = process.env.SMS_ENABLED !== "false"; // default true

/** Safe logger */
function logJson(level, label, obj) {
  const text = `${label} ${JSON.stringify(obj)}`;
  if (level === "error") logger.error(text);
  else if (level === "warn") logger.warn(text);
  else logger.info(text);
}

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

/** Prefer userAddress, fallback to alertLocation */
function getFireAddress(dispatch) {
  return (
    dispatch?.userAddress ||
    dispatch?.alertAddress ||
    dispatch?.alertLocation ||
    dispatch?.location ||
    "Unknown location"
  );
}

/** Remove emoji / non-ascii */
function stripNonAscii(s) {
  return String(s || "").replace(/[^\x00-\x7F]/g, "").trim();
}

/** SHORTEN to reduce multipart risk (helps deliverability + less credits) */
function shorten(s, max) {
  s = stripNonAscii(s || "");
  if (s.length <= max) return s;
  return s.slice(0, max - 3).trimEnd() + "...";
}

/** Build compact SMS (try to keep sms_count=1) */
function buildDispatchSmsText(dispatch, responderName = "Responder") {
  const name = shorten(responderName, 16) || "Responder";
  const alertType = shorten(dispatch?.alertType || "Alert", 22);
  const address = shorten(getFireAddress(dispatch), 45);

  // ~ under 160 chars most of the time
  return `APULA DISPATCH\nHi ${name}\nTo: ${address}\nType: ${alertType}`;
}

/** Extract responder IDs (supports multiple shapes) */
function extractResponderIds(respondersRaw) {
  const ids = respondersRaw
    .map((r) => r?.id || r?.uid || r?.responderId || r?.userId)
    .filter(Boolean);
  return [...new Set(ids)];
}

/** Fetch responder user docs referenced by dispatch.responders */
async function getResponderUsersFromDispatch(dispatch, dispatchIdForLogs = "") {
  const respondersRaw = Array.isArray(dispatch?.responders) ? dispatch.responders : [];

  logJson("info", `Dispatch ${dispatchIdForLogs} responders raw:`, respondersRaw);

  const ids = extractResponderIds(respondersRaw);
  logJson("info", `Dispatch ${dispatchIdForLogs} responder IDs:`, ids);

  if (ids.length === 0) return [];

  const db = admin.firestore();
  const snaps = await Promise.all(ids.map((uid) => db.collection("users").doc(uid).get()));

  const existsMap = snaps.map((s, i) => ({ id: ids[i], exists: s.exists }));
  logJson("info", `Dispatch ${dispatchIdForLogs} user-doc exists:`, existsMap);

  return snaps.filter((s) => s.exists).map((s) => ({ id: s.id, ...s.data() }));
}

/** Send SMS via PhilSMS (FORCED plain + ASCII) */
async function sendPhilSms({ token, senderId, recipient, message }) {
  const sid = String(senderId || "").trim();
  const safeMessage = stripNonAscii(message);

  const payload = {
    recipient: String(recipient),
    sender_id: sid, // you can remove if you want (some carriers filter alphanumeric sender)
    type: "plain",
    message: safeMessage,
  };

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
 * ✅ DEDUPE: check/set per responder log
 * dispatches/{dispatchId}/smsLogs/{uid}
 */
function smsLogRef(dispatchId, uid) {
  return admin.firestore().collection("dispatches").doc(dispatchId).collection("smsLogs").doc(uid);
}

/**
 * Core routine: send SMS to all opted-in responders in a dispatch doc.
 * ✅ credit-protected: never sends twice to same responder for same dispatch
 */
async function sendDispatchSmsToResponders(dispatchId, dispatch) {
  if (!SMS_ENABLED) {
    logger.warn(`SMS_ENABLED=false. Skipping all SMS for dispatch ${dispatchId}.`);
    return { attempted: 0, sent: 0, skippedAlreadySent: 0 };
  }

  const token = PHILSMS_TOKEN.value();
  const senderId = PHILSMS_SENDER_ID.value();

  const users = await getResponderUsersFromDispatch(dispatch, dispatchId);
  if (users.length === 0) {
    logger.warn(`Dispatch ${dispatchId}: no responder user docs found. SMS skipped.`);
    return { attempted: 0, sent: 0, skippedAlreadySent: 0 };
  }

  const candidates = users.map((u) => {
    const normalized = normalizePHMobile(u?.contact);
    return {
      uid: u?.id,
      name: u?.name || u?.email || "Responder",
      role: u?.role,
      smsOptIn: u?.smsOptIn,
      contact: u?.contact,
      normalized,
    };
  });

  const opted = candidates.filter((c) => {
    const role = String(c.role || "").trim().toLowerCase();
    const optIn = c.smsOptIn === true || c.smsOptIn === "true";
    return role === "responder" && optIn && !!c.normalized;
  });

  if (opted.length === 0) {
    logger.warn(`Dispatch ${dispatchId}: no opted-in responders with valid numbers.`);
    return { attempted: 0, sent: 0, skippedAlreadySent: 0 };
  }

  let attempted = 0;
  let sent = 0;
  let skippedAlreadySent = 0;

  for (const r of opted) {
    // ✅ HARD DEDUPE: if already logged as SENT, skip (no credits spent)
    const logRef = smsLogRef(dispatchId, r.uid);
    const logSnap = await logRef.get();

    if (logSnap.exists && logSnap.data()?.sent === true) {
      skippedAlreadySent++;
      logger.info(`Dispatch ${dispatchId}: SKIP ${r.uid} already sent before.`);
      continue;
    }

    // ✅ Create a "lock" first to avoid double-sends if function runs twice concurrently
    // (best-effort; simple approach)
    await logRef.set(
      {
        uid: r.uid,
        to: r.normalized,
        name: r.name,
        sent: false,
        status: "LOCKED",
        lockedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const smsText = buildDispatchSmsText(dispatch, r.name);

    attempted++;
    logger.info(`Dispatch ${dispatchId} -> sending SMS to ${r.normalized} (${r.name})`);
    logger.info(`DISPATCH smsText:\n${smsText}`);

    try {
      const result = await sendPhilSms({
        token,
        senderId,
        recipient: r.normalized,
        message: smsText,
      });

      logger.info(`PhilSMS HTTP status: ${result.httpStatus}`);
      logJson("info", "PhilSMS raw response:", result.data);

      const ok = result?.httpStatus === 200 && result?.data?.status === "success";

      await logRef.set(
        {
          sent: ok,
          status: ok ? "SENT" : "FAILED",
          httpStatus: result.httpStatus,
          provider: "PhilSMS",
          providerResponse: result.data,
          payloadSent: result.payloadSent,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      if (!ok) {
        logger.error(`PhilSMS FAILED for ${r.normalized}`);
        continue;
      }

      sent++;
      logger.info(`PhilSMS SENT OK to ${r.normalized}`);
    } catch (err) {
      const errData = err?.response?.data || err?.message || String(err);

      await logRef.set(
        {
          sent: false,
          status: "ERROR",
          error: errData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      logger.error(`PhilSMS ERROR for ${r.normalized}: ${JSON.stringify(errData)}`);
      continue;
    }
  }

  return { attempted, sent, skippedAlreadySent };
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
    try {
      const dispatchId = event.params.dispatchId;
      const dispatch = event.data?.data();

      logger.info(`SMS TRIGGER FIRED (created): ${dispatchId}`);
      if (!dispatch) return;

      await sendDispatchSmsToResponders(dispatchId, dispatch);
    } catch (err) {
      logger.error(
        "onDispatchCreatedSendSms crashed: " +
          JSON.stringify(err?.response?.data || err?.message || String(err))
      );
    }
  }
);

/**
 * Trigger B: UPDATED -> status becomes Dispatched
 * ✅ Prevent duplicates with smsNotified + per-responder logs
 */
exports.onDispatchUpdatedSendSms = onDocumentUpdated(
  {
    document: "dispatches/{dispatchId}",
    secrets: [PHILSMS_TOKEN, PHILSMS_SENDER_ID],
    region: "us-central1",
  },
  async (event) => {
    try {
      const dispatchId = event.params.dispatchId;
      const before = event.data?.before?.data();
      const after = event.data?.after?.data();
      if (!before || !after) return;

      const beforeStatus = before.status || "";
      const afterStatus = after.status || "";

      // only when becomes Dispatched
      if (!(beforeStatus !== "Dispatched" && afterStatus === "Dispatched")) return;

      // dispatch-level guard
      if (after.smsNotified === true) {
        logger.info(`SMS already notified for dispatch: ${dispatchId}`);
        return;
      }

      logger.info(`SMS TRIGGER FIRED (updated->Dispatched): ${dispatchId}`);

      const stats = await sendDispatchSmsToResponders(dispatchId, after);

      // ✅ only set smsNotified if we actually attempted anything
      // (prevents marking notified when SMS_ENABLED=false or no candidates)
      if (stats.attempted > 0) {
        await event.data.after.ref.update({
          smsNotified: true,
          smsNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          smsStats: stats,
        });
        logger.info(`Dispatch ${dispatchId}: smsNotified flag set ✅`);
      } else {
        logger.warn(`Dispatch ${dispatchId}: no SMS attempted; smsNotified not set.`);
      }
    } catch (err) {
      logger.error(
        "onDispatchUpdatedSendSms crashed: " +
          JSON.stringify(err?.response?.data || err?.message || String(err))
      );
    }
  }
);

/**
 * Manual test endpoint:
 * https://us-central1-apula-36cee.cloudfunctions.net/testSendSms?to=09xxxxxxxxx
 */
exports.testSendSms = onRequest(
  {
    secrets: [PHILSMS_TOKEN, PHILSMS_SENDER_ID],
    region: "us-central1",
  },
  async (req, res) => {
    try {
      if (!SMS_ENABLED) {
        return res.status(200).json({ ok: true, skipped: true, reason: "SMS_ENABLED=false" });
      }

      const to = String(req.query.to || "").trim();
      if (!to) return res.status(400).json({ ok: false, error: "Missing ?to=" });

      const phone = normalizePHMobile(to);
      if (!phone) return res.status(400).json({ ok: false, error: "Invalid phone format" });

      const msg = `APULA TEST\nHi Responder\nTime: ${new Date().toISOString()}`;

      const result = await sendPhilSms({
        token: PHILSMS_TOKEN.value(),
        senderId: PHILSMS_SENDER_ID.value(),
        recipient: phone,
        message: msg,
      });

      return res.status(200).json({
        ok: true,
        normalized: phone,
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