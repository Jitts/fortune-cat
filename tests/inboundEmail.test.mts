/**
 * The pure helpers behind the inbound-email webhook.
 * Run: node --experimental-strip-types tests/inboundEmail.test.mts
 *
 * These exist because of two real failures, both silent.
 *
 * The first: the route read `headers.from` directly and the helpers lived
 * inside the route, which imports next/server and so could not be loaded by a
 * test at all.
 *
 * The second, worse: Google used to put the confirmation code in the subject as
 * "(#123456789)" and has stopped. Extraction returned null, the setup email was
 * parsed as an ordinary transaction, matched nothing, and vanished — leaving
 * Gmail waiting on a verification that nothing could ever satisfy. The fixtures
 * below are the real message, taken from a live delivery.
 */
import { tokenFromRecipient, extractGmailConfirmation } from "../lib/email/inboundEmail.ts";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${detail ? `  — ${detail}` : ""}`);
  }
}

console.log("\nRouting the +tag to a user");
check(
  "plain address",
  tokenFromRecipient("22879dbea2c4c8f0cee9+tvkunte8aqcbcc8r2fzdnek3@cloudmailin.net") ===
    "tvkunte8aqcbcc8r2fzdnek3",
);
check(
  "angle-bracket form",
  tokenFromRecipient("Fortune Cat <abc123+sometoken1234567890@cloudmailin.net>") ===
    "sometoken1234567890",
);
check(
  "case-folded by the mail system still matches",
  tokenFromRecipient("ABC123+SOMETOKEN1234567890@CloudMailin.net") === "sometoken1234567890",
);
check("no tag means unroutable", tokenFromRecipient("abc123@cloudmailin.net") === "");
check("empty input is safe", tokenFromRecipient("") === "");
check(
  "only the first + starts the tag, the rest is part of it",
  tokenFromRecipient("abc+tok+en@x.com") === "tok+en",
);

console.log("\nThe real Gmail confirmation — the message that must never be swallowed");

// Verbatim from a live CloudMailin delivery. Note what is NOT here: the
// "(#123456789)" the first implementation looked for.
const REAL_SUBJECT = "(Gmail Forwarding Confirmation - Receive Mail from jitsiong91@gmail.com)";
const REAL_BODY = [
  "jitsiong91@gmail.com has requested to automatically forward mail to your email address.",
  "",
  "To allow this, please click the link below to confirm the request:",
  "",
  "https://mail.google.com/mail/vf-%5BANGjdJ8kQmXw2Lp4vRt7yNc%5D-abc123",
  "",
  "Thanks,",
  "The Gmail Team",
].join("\n");

const real = extractGmailConfirmation("forwarding-noreply@google.com", REAL_SUBJECT, REAL_BODY);
check("the real message is recognised", real !== null);
check(
  "the one-click link is recovered",
  real?.url === "https://mail.google.com/mail/vf-%5BANGjdJ8kQmXw2Lp4vRt7yNc%5D-abc123",
  real?.url ?? "(null)",
);
check(
  "still recognised when the From header is unreadable",
  extractGmailConfirmation("", REAL_SUBJECT, REAL_BODY) !== null,
);

const labelled = extractGmailConfirmation(
  "forwarding-noreply@google.com",
  "Gmail Forwarding Confirmation",
  "Confirmation code: 987654321\n\nTo allow this, click the link below.",
);
check("labelled code still read", labelled?.code === "987654321", labelled?.code ?? "(null)");

const legacy = extractGmailConfirmation(
  "Gmail Team <forwarding-noreply@google.com>",
  "(#123456789) Gmail Forwarding Confirmation - Receive Mail from you@gmail.com",
  "",
);
check("the old subject form still works", legacy?.code === "123456789");

const bareNumber = extractGmailConfirmation(
  "forwarding-noreply@google.com",
  "Gmail Forwarding Confirmation",
  "Your code is below.\n\n445566778\n\nEnter it in Gmail.",
);
check("a bare number is taken as a last resort", bareNumber?.code === "445566778");

const trailing = extractGmailConfirmation(
  "forwarding-noreply@google.com",
  "Gmail Forwarding Confirmation",
  "Click https://mail.google.com/mail/vf-abc123. Thanks.",
);
check(
  "trailing sentence punctuation is trimmed from the link",
  trailing?.url === "https://mail.google.com/mail/vf-abc123",
  trailing?.url ?? "(null)",
);

const empty = extractGmailConfirmation(
  "forwarding-noreply@google.com",
  "Gmail Forwarding Confirmation",
  "nothing useful here",
);
check(
  "recognised but empty-handed still returns an object, never null",
  empty !== null && empty.code === null && empty.url === null,
  "null would send a setup email down the transaction path — exactly the original bug",
);

console.log("\nNot a confirmation — ordinary mail must pass through");
check(
  "a bank alert is not a confirmation",
  extractGmailConfirmation("alerts@dbs.com.sg", "Transaction Alert", "SGD 45.20 charged") === null,
);
check(
  "a bank alert with a long reference number is not a confirmation",
  extractGmailConfirmation("alerts@dbs.com.sg", "Receipt (#123456789)", "SGD 45.20") === null,
  "the paren pattern alone must not be enough to claim a message",
);
check(
  "a forwarded receipt mentioning Google is not a confirmation",
  extractGmailConfirmation(
    "receipts@shop.com",
    "Your order",
    "Paid with Google Pay. Total 45.20.",
  ) === null,
);

console.log(`\n${pass}/${pass + fail} passed`);
if (fail > 0) process.exit(1);
