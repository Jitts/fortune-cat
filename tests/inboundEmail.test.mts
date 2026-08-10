/**
 * The pure helpers behind the inbound-email webhook.
 * Run: node --experimental-strip-types tests/inboundEmail.test.mts
 *
 * These exist because of a real failure. The route read `headers.from`
 * directly, CloudMailin sent a different key shape, and Google's forwarding
 * confirmation was consumed as an ordinary message and lost — leaving a Gmail
 * screen that could never be verified and no trace of why.
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

console.log("\nGmail confirmation — the message that must never be swallowed");
const googleSubject = "(#123456789) Gmail Forwarding Confirmation - Receive Mail from you@gmail.com";
check(
  "recognised by sender",
  extractGmailConfirmation("Gmail Team <forwarding-noreply@google.com>", googleSubject, "") ===
    "123456789",
);
check(
  "still recognised when the From header is unreadable",
  extractGmailConfirmation("", googleSubject, "") === "123456789",
  "this is the case that actually broke",
);
check(
  "code read from the body when absent from the subject",
  extractGmailConfirmation(
    "forwarding-noreply@google.com",
    "Gmail Forwarding Confirmation",
    "Confirmation code: 987654321\n\nTo allow this, click the link below.",
  ) === "987654321",
);
check(
  "tolerates spaces inside the parens",
  extractGmailConfirmation("forwarding-noreply@google.com", "(# 123456789 ) Confirmation", "") ===
    "123456789",
);

console.log("\nNot a confirmation — ordinary mail must pass through");
check(
  "a bank alert is not a confirmation",
  extractGmailConfirmation("alerts@dbs.com.sg", "Transaction Alert", "SGD 45.20 charged") === null,
);
check(
  "a bank alert with a long reference number is not a confirmation",
  extractGmailConfirmation("alerts@dbs.com.sg", "Receipt (#123456789)", "SGD 45.20") === null,
  "the paren pattern alone must not be enough",
);
check(
  "confirmation-shaped subject with no code is left alone",
  extractGmailConfirmation("forwarding-noreply@google.com", "Forwarding Confirmation", "no code") ===
    null,
);

console.log(`\n${pass}/${pass + fail} passed`);
if (fail > 0) process.exit(1);
