import fs from "fs";
import path from "path";

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        let val = trimmed.slice(eqIndex + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadLocalEnv();

async function verifyPaystackCredentials() {
  console.log("================================================================================");
  console.log("🔐 NOTARI 2.0: PAYSTACK CREDENTIALS & TEST MODE AUTHENTICATION VERIFICATION");
  console.log("================================================================================\n");

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  const callbackUrl = process.env.PAYSTACK_CALLBACK_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  // 1. Environment variable inspection (Without exposing secret values)
  console.log("1. Environment Configuration Status:");
  const secretKeyConfigured = Boolean(secretKey && secretKey.trim().length > 0);
  const secretKeyLength = secretKey ? secretKey.length : 0;
  const secretKeyPrefix = secretKey ? secretKey.slice(0, 8) : "none";
  const isSecretKeyTest = secretKey ? secretKey.startsWith("sk_test_") : false;

  console.log(`   - PAYSTACK_SECRET_KEY configured: ${secretKeyConfigured ? "YES" : "NO"}`);
  console.log(`   - PAYSTACK_SECRET_KEY length: ${secretKeyLength} characters`);
  console.log(`   - PAYSTACK_SECRET_KEY prefix: ${secretKeyPrefix}...`);
  console.log(`   - Mode: ${isSecretKeyTest ? "TEST MODE (Safe)" : secretKey?.startsWith("sk_live_") ? "LIVE MODE (Caution!)" : "UNKNOWN"}`);

  const publicKeyConfigured = Boolean(publicKey && publicKey.trim().length > 0);
  const publicKeyPrefix = publicKey ? publicKey.slice(0, 8) : "none";
  const isPublicKeyTest = publicKey ? publicKey.startsWith("pk_test_") : false;

  console.log(`   - NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY configured: ${publicKeyConfigured ? "YES" : "NO"}`);
  console.log(`   - NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY prefix: ${publicKeyPrefix}...`);
  console.log(`   - Public Key Mode: ${isPublicKeyTest ? "TEST MODE (Safe)" : "OTHER"}`);

  console.log(`   - PAYSTACK_CALLBACK_URL: ${callbackUrl || "Not set (will default to NEXT_PUBLIC_APP_URL/payment/verify)"}`);
  console.log(`   - NEXT_PUBLIC_APP_URL: ${appUrl || "http://localhost:3000"}`);

  if (!secretKeyConfigured) {
    console.error("\n❌ FATAL: PAYSTACK_SECRET_KEY is missing from environment.");
    process.exit(1);
  }

  if (!isSecretKeyTest) {
    console.warn("\n⚠️ WARNING: PAYSTACK_SECRET_KEY does not start with 'sk_test_'. Ensure this is a test key!");
  }

  // 2. Perform live authenticated request to Paystack API
  console.log("\n2. Executing Authenticated Request to Paystack API (GET /bank?country=nigeria&perPage=1)...");
  try {
    const bankRes = await fetch("https://api.paystack.co/bank?country=nigeria&perPage=1", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });

    const bankData = await bankRes.json();
    console.log(`   - HTTP Status: ${bankRes.status} ${bankRes.statusText}`);
    console.log(`   - API Status: ${bankData.status}`);
    console.log(`   - Message: ${bankData.message}`);

    if (bankRes.status === 200 && bankData.status === true) {
      console.log("   ✅ SUCCESS: Paystack accepted configured secret key!");
      console.log(`   - Sample Bank Retrieved: ${bankData.data?.[0]?.name || "Bank data returned"}`);
    } else {
      console.error("   ❌ FAILURE: Paystack rejected authentication credentials.");
      console.error("   - Response:", JSON.stringify(bankData, null, 2));
      process.exit(1);
    }

    // Check account integration capabilities (test mode check)
    console.log("\n3. Testing Paystack Integration Details (GET /integration/payment_session_timeout)...");
    const timeoutRes = await fetch("https://api.paystack.co/integration/payment_session_timeout", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });

    const timeoutData = await timeoutRes.json();
    console.log(`   - HTTP Status: ${timeoutRes.status}`);
    console.log(`   - Status: ${timeoutData.status}`);
    console.log(`   - Payment Session Timeout: ${timeoutData.data?.payment_session_timeout ?? "default"} seconds`);

    console.log("\n================================================================================");
    console.log("🎉 PAYSTACK TEST MODE CONNECTION VERIFIED SUCCESSFULLY!");
    console.log("================================================================================\n");
  } catch (error) {
    console.error("   ❌ Network or Fetch Error connecting to Paystack:", error);
    process.exit(1);
  }
}

verifyPaystackCredentials();

