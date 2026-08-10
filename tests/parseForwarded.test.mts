/**
 * Real forward headers from the clients people actually use, including the
 * localised ones. Run: node --experimental-strip-types tests/parseForwarded.test.mts
 *
 * These are the actual module's exports, not a transcription of them — the
 * point is to catch the case where the parser and the fixture drift apart.
 */
import { parseForwardedMessage, extractAddress } from "../lib/email/parseForwarded.ts";

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

console.log("\nAddress extraction");
check("angle form", extractAddress("DBS Bank <alerts@dbs.com.sg>") === "alerts@dbs.com.sg");
check("bare form", extractAddress("alerts@dbs.com.sg") === "alerts@dbs.com.sg");
check("lowercases", extractAddress("<Alerts@DBS.com.SG>") === "alerts@dbs.com.sg");
check("no address", extractAddress("DBS Bank") === "");
check(
  "picks the angled one when a name contains an @",
  extractAddress('"me@home" <alerts@dbs.com.sg>') === "alerts@dbs.com.sg",
);

console.log("\nGmail (English)");
const gmail = parseForwardedMessage(
  `Here's the receipt.

---------- Forwarded message ---------
From: DBS Bank <alerts@dbs.com.sg>
Date: Mon, 10 Aug 2026 at 14:32
Subject: Transaction Alert
To: Jit Siong <jitsiong91@gmail.com>

Dear Customer, a transaction of SGD 45.20 was made at COLD STORAGE.`,
);
check("unwrapped", gmail.unwrapped);
check("original sender", gmail.from === "alerts@dbs.com.sg", gmail.from);
check("subject", gmail.subject === "Transaction Alert", gmail.subject);
check("date read", gmail.date !== null && gmail.date.getUTCFullYear() === 2026);
check("body starts at the message", gmail.body.startsWith("Dear Customer"), gmail.body.slice(0, 40));
check("forwarder's note dropped", !gmail.body.includes("Here's the receipt"));

console.log("\nApple Mail");
const apple = parseForwardedMessage(
  `Begin forwarded message:

From: OCBC <no-reply@ocbc.com>
Subject: Card transaction
Date: 10 August 2026 at 14:32:10 GMT+8
To: Jit Siong <jitsiong91@gmail.com>

Your card ending 1234 was charged SGD 12.00.`,
);
check("unwrapped", apple.unwrapped);
check("original sender", apple.from === "no-reply@ocbc.com", apple.from);
check("subject", apple.subject === "Card transaction", apple.subject);
check("body", apple.body.startsWith("Your card ending"), apple.body.slice(0, 30));

console.log("\nOutlook (underscore rule, Sent: not Date:)");
const outlook = parseForwardedMessage(
  `________________________________
From: UOB <alerts@uob.com.sg>
Sent: Monday, 10 August 2026 14:32
To: Jit Siong
Subject: Transaction notification

You spent SGD 8.50 at KOPITIAM.`,
);
check("unwrapped", outlook.unwrapped);
check("original sender", outlook.from === "alerts@uob.com.sg", outlook.from);
check("Sent: read as the date", outlook.date !== null);
check("subject after To:", outlook.subject === "Transaction notification", outlook.subject);

console.log("\nLocalised — the reason this isn't marker-matching");
const french = parseForwardedMessage(
  `---------- Message transféré ---------
De : Banque <alertes@bnp.fr>
Date : lun. 10 août 2026 à 14:32
Objet : Notification de transaction
À : Jit <jit@example.com>

Un paiement de 45,20 EUR a été effectué.`,
);
check("French unwrapped", french.unwrapped);
check("French sender", french.from === "alertes@bnp.fr", french.from);
check("French subject", french.subject === "Notification de transaction", french.subject);

const chinese = parseForwardedMessage(
  `---------- 转发的邮件 ---------
发件人: 中国银行 <alerts@boc.cn>
日期: 2026年8月10日
主题: 交易通知
收件人: Jit <jit@example.com>

您的账户支出 CNY 200.00。`,
);
check("Chinese unwrapped", chinese.unwrapped);
check("Chinese sender", chinese.from === "alerts@boc.cn", chinese.from);
check("Chinese subject", chinese.subject === "交易通知", chinese.subject);

const german = parseForwardedMessage(
  `Von: Sparkasse <service@sparkasse.de>
Datum: 10. August 2026 um 14:32
Betreff: Umsatzbenachrichtigung
An: Jit <jit@example.com>

Ihre Karte wurde mit EUR 45,20 belastet.`,
);
check("German unwrapped", german.unwrapped);
check("German sender", german.from === "service@sparkasse.de", german.from);

console.log("\nSoft failure — nothing may be lost");
const plain = parseForwardedMessage("Just a note about my spending, no forward here.");
check("not unwrapped", !plain.unwrapped);
check("body preserved intact", plain.body === "Just a note about my spending, no forward here.");
check("no invented sender", plain.from === "");

const loneFrom = parseForwardedMessage(
  `Hi, quick question.

From: my accountant

Do I need to keep these?`,
);
check(
  "a lone From: line is not treated as a forward block",
  !loneFrom.unwrapped,
  `got from=${loneFrom.from}`,
);

const prose = parseForwardedMessage(
  `I paid this: see below
And another thing: it was expensive`,
);
check("prose with colons is not a header block", !prose.unwrapped);

const noAddress = parseForwardedMessage(
  `---------- Forwarded message ---------
From: DBS Bank
Subject: Transaction Alert

Body here.`,
);
check("From: with no parseable address falls back", !noAddress.unwrapped);
check("body still intact on fallback", noAddress.body.includes("Body here."));

console.log("\nDate handling");
const badDate = parseForwardedMessage(
  `From: DBS Bank <alerts@dbs.com.sg>
Date: sometime last Tuesday
Subject: Alert

Charged SGD 5.`,
);
check("unparseable date becomes null, not now()", badDate.unwrapped && badDate.date === null);

const noDate = parseForwardedMessage(
  `From: DBS Bank <alerts@dbs.com.sg>
Subject: Alert

Charged SGD 5.`,
);
check("missing date is null", noDate.unwrapped && noDate.date === null);

console.log(`\n${pass}/${pass + fail} passed`);
if (fail > 0) process.exit(1);
