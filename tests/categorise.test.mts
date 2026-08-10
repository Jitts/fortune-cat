/**
 * Direction and categorisation.
 * Run: node --import ./tests/register-alias.mjs --experimental-strip-types tests/categorise.test.mts
 *
 * The fixtures marked LIVE are real messages that reached a real ledger and
 * were classified wrongly. Two failures prompted this file:
 *
 *  1. "[Manulife]We have received PayNow Collection amount of S$484.07" was
 *     booked as INCOME because the rule matched the verb "received" without
 *     asking who received it. Manulife did; the reader paid. It auto-posted
 *     because Manulife is a trusted sender, and had to be corrected by hand.
 *     A mis-signed S$484.07 moves the ledger by S$968.14.
 *
 *  2. A PayLah alert for a food stall was categorised from the marketing
 *     footer rather than the payee, because the tagger was handed the whole
 *     email body.
 */
import { parseSmsTransaction } from "@/lib/sms/parseSms";
import { parseEmailForTransaction, extractPayee } from "@/lib/email/parseCandidate";
import { suggestCategory } from "@/lib/tagger";

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

console.log("\nDirection — who actually received the money");

// LIVE: the premium payment that was booked as income.
const premium = parseSmsTransaction(
  "[Manulife]We have received PayNow Collection amount of S$484.07 for insurance policy ending 9193 on 11-AUG-26. Thank you",
  "SGD",
);
check("a premium the biller received is an expense", premium?.type === "expense", premium?.type);
check("and it is read, not guessed", premium?.typeConfident === true);
check("amount intact", premium?.amount === 484.07);

// LIVE: the payout from the same sender, days apart. Same verb family,
// opposite direction — only the subject of the sentence separates them.
const payout = parseSmsTransaction(
  "[Manulife]Dear Customer, we have credited your payout of SGD 409.10 for your insurance policy ending with 4442 into your account",
  "SGD",
);
check("a payout credited to you is income", payout?.type === "income", payout?.type);
check("and it is read, not guessed", payout?.typeConfident === true);

const salary = parseSmsTransaction("Your salary of SGD 5,000.00 has been credited to your account", "SGD");
check("salary is income", salary?.type === "income");
check("salary is categorised as Salary", salary?.category === "Salary", salary?.category ?? "null");

const spend = parseSmsTransaction("Your card ending 3059 was used for SGD 5.96 at STARBUCKS on 10/08", "SGD");
check("an ordinary card debit is an expense", spend?.type === "expense");
check("with no uncertainty flagged", spend?.typeConfident === true);

const ambiguous = parseSmsTransaction("Transaction of SGD 30.00 received. Ref 88213", "SGD");
check(
  "a bare 'received' with no direction is flagged, not assumed",
  ambiguous?.typeConfident === false,
  `typeConfident=${ambiguous?.typeConfident}`,
);
check("and defaults to the commoner case meanwhile", ambiguous?.type === "expense");

console.log("\nCategorising on the payee, not the whole email");

// A bank alert is a few lines of transaction inside several hundred words of
// boilerplate. The marketing footer is the part that used to win.
const paylahBody = `Transaction Alerts
Problems viewing this email? Select "always display images".
[image: DBS]
Transaction Ref: TF606841783580177878
Dear Customer,
You have made a payment of SGD 2.00 to KOPI STALL on 10 Aug 2026.
Enjoy dining deals and food rewards with PayLah! Book a hotel, grab a ride.
This is a system-generated email. Please do not reply.`;

check("payee is found", extractPayee(paylahBody) === "KOPI STALL", extractPayee(paylahBody) ?? "null");

const paylah = parseEmailForTransaction("Transaction Alerts", paylahBody, "SGD");
check("amount still read from the body", paylah?.amount === 2);
check(
  "not categorised from the marketing footer",
  paylah?.category !== "Transport" && paylah?.category !== "Travel",
  `got ${paylah?.category}`,
);

// The footer alone must not be able to decide anything.
const footerOnly = `Transaction Alerts
You have made a payment of SGD 12.00 on 10 Aug 2026.
Enjoy dining deals. Book a hotel, grab a ride, watch a movie.`;
const noPayee = parseEmailForTransaction("Transaction Alerts", footerOnly, "SGD");
check(
  "with no payee, an unhelpful subject yields no category rather than a wrong one",
  noPayee?.category === null,
  `got ${noPayee?.category}`,
);

check("a reference number is not mistaken for a payee",
  extractPayee("Payment to 8829301823 on 10 Aug") === null,
  extractPayee("Payment to 8829301823 on 10 Aug") ?? "null");

console.log("\nNo more inventing Salary for anything incoming");
check(
  "unrecognised income is left uncategorised",
  suggestCategory("PayNow transfer from a friend", "income") === null,
);
check(
  "real salary wording still matches",
  suggestCategory("Monthly payroll credit", "income")?.category === "Salary",
);
check(
  "unrecognised expense is still left uncategorised",
  suggestCategory("Ref 88213", "expense") === null,
);

console.log("\nAdverts are not transactions");

// LIVE: this was booked as a $100 expense and auto-posted, because the sender
// was trusted and the body happened to mention a figure.
check(
  "an <ADV> email is not a transaction",
  parseEmailForTransaction(
    "<ADV> Don’t let inflation erode your savings!",
    "Grow your money. Deposit SGD 100 today and earn more. Terms apply.",
    "SGD",
  ) === null,
);
// LIVE: read as $500, and only escaped because its sender wasn't trusted yet.
check(
  "the second live advert is also refused",
  parseEmailForTransaction(
    "<ADV> How can we improve your community?",
    "Tell us and stand to win SGD 500 in vouchers.",
    "SGD",
  ) === null,
);
check(
  "bracket variants too",
  parseEmailForTransaction("[ADV] Big sale", "Spend SGD 50 and save", "SGD") === null,
);
check(
  "and in SMS",
  parseSmsTransaction("<ADV> Spend SGD 50 at our store and get 10% off", "SGD") === null,
);
check(
  "but a real receipt that merely mentions advice is untouched",
  parseEmailForTransaction(
    "Your receipt",
    "You paid SGD 20.00 to ADVISORY SERVICES on 10 Aug 2026.",
    "SGD",
  ) !== null,
  "the prefix must be bracketed — a word starting with 'adv' is not a declaration",
);

console.log("\nStill categorising what it should");
check("a known merchant wins", suggestCategory("STARBUCKS SG", "expense")?.category === "Food & Drink");
check("a ride is Transport", suggestCategory("GRAB*RIDE", "expense")?.category === "Transport");

console.log("\nThe six categories nothing could reach before");
const reaches = (text: string, expected: string) => {
  const got = suggestCategory(text, "expense")?.category;
  check(`${expected.padEnd(18)} ← "${text}"`, got === expected, `got ${got ?? "null"}`);
};
// LIVE: this is the message whose premium had nowhere to go.
reaches("[Manulife] payment received for insurance policy ending 9193", "Insurance");
reaches("NTUC FAIRPRICE grocery run", "Groceries");
reaches("Monthly rent to landlord", "Housing");
reaches("SHOPEE order #22910", "Online Shopping");
reaches("Coursera course enrolment", "Education");
reaches("Donation to charity", "Gifts & Donations");

console.log("\nThe splits didn't cost their parents");
reaches("Dinner at the restaurant", "Food & Drink");
reaches("UNIQLO store purchase", "Shopping");
reaches("Singtel broadband bill", "Utilities");

console.log("\nTies go to the narrower category, not to declaration order");
check(
  "supermarket food shop is Groceries, not Food & Drink",
  suggestCategory("grocery food shop", "expense")?.category === "Groceries",
  suggestCategory("grocery food shop", "expense")?.category ?? "null",
);
check(
  "an online order is Online Shopping, not Shopping",
  suggestCategory("shopee order", "expense")?.category === "Online Shopping",
  suggestCategory("shopee order", "expense")?.category ?? "null",
);

console.log("\nWords that used to drag things into Salary");
check(
  "an invoice is not salary",
  suggestCategory("Your receipt from Anthropic, PBC #2932-6788-2138 invoice", "expense")?.category !==
    "Salary",
  suggestCategory("Your receipt from Anthropic, PBC invoice", "expense")?.category ?? "null",
);
check(
  "a refund is not salary",
  suggestCategory("Refund processed", "income")?.category !== "Salary",
);

console.log("\nEmail direction — one shared rule, not a second list");

// LIVE: booked as an EXPENSE and auto-posted. "received" on its own wasn't in
// the email parser's income list, and that list was separate from the SMS one,
// so the same mistake shipped twice in opposite directions.
const inboundEmail = parseEmailForTransaction(
  "digibank Alerts - You've received a transfer",
  "You've received a transfer of SGD 21.00 from a friend.",
  "SGD",
);
check("an incoming transfer is income", inboundEmail?.type === "income", inboundEmail?.type);
check("and it is read, not guessed", inboundEmail?.typeConfident === true);

const outboundEmail = parseEmailForTransaction(
  "Transaction Alerts",
  "You have made a payment of SGD 2.00 to KOPI STALL on 10 Aug 2026.",
  "SGD",
);
check("an outgoing payment is an expense", outboundEmail?.type === "expense", outboundEmail?.type);
check("and it is read, not guessed", outboundEmail?.typeConfident === true);

const vagueEmail = parseEmailForTransaction(
  "Alert",
  "A payment of SGD 30.00 was credited. Ref 88213.",
  "SGD",
);
check(
  "an email with no stated direction is flagged rather than assumed",
  vagueEmail?.typeConfident === false,
  `typeConfident=${vagueEmail?.typeConfident}`,
);

// The two parsers must agree — that is the point of sharing the function.
const bothWays = [
  "We have received your payment of SGD 100.00",
  "You have received SGD 100.00 into your account",
];
for (const text of bothWays) {
  const viaSms = parseSmsTransaction(text, "SGD");
  const viaEmail = parseEmailForTransaction("Alert", text, "SGD");
  check(
    `both parsers agree on "${text.slice(0, 28)}…"`,
    viaSms?.type === viaEmail?.type,
    `sms=${viaSms?.type} email=${viaEmail?.type}`,
  );
}

console.log(`\n${pass}/${pass + fail} passed`);
if (fail > 0) process.exit(1);
