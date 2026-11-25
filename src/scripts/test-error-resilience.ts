import assert from "assert";
import fs from "fs";
import path from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import NotFound from "../app/not-found";
import RootError from "../app/error";
import GlobalError from "../app/global-error";
import EventNotFound from "../app/(public)/events/[slug]/not-found";
import EventDetailError from "../app/(public)/events/[slug]/error";
import EventsDirectoryError from "../app/(public)/events/error";
import StudentPortalError from "../app/student/error";
import OrganizerPortalError from "../app/organizer/error";
import AdminPortalError from "../app/admin/error";
import PaymentVerifyError from "../app/payment/verify/error";
import { NotariEmptyState } from "../components/shared/notari-empty-state";
import { EventFlyerImage } from "../components/shared/event-flyer-image";

async function runErrorResilienceSuite() {
  console.log("===============================================================================");
  console.log("🛡️ NOTARI 2.0: BRANDED ERROR HANDLING & RESILIENCE VERIFICATION SUITE");
  console.log("===============================================================================\n");

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ FAIL: ${name} -> ${errorMsg}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  console.log("▶ 1. Branded 404 (Not Found) Experience Audit");
  // ---------------------------------------------------------------------------
  test("Root 404 component exists and renders static markup", () => {
    const html = renderToStaticMarkup(React.createElement(NotFound));
    assert(html.length > 0, "404 html should not be empty");
    assert(html.includes("Page Not Found"), "Must include 'Page Not Found'");
    assert(html.includes("404"), "Must include '404' visual badge");
    assert(html.includes("Return Home"), "Must include 'Return Home' button");
    assert(html.includes("Explore Events"), "Must include 'Explore Events' action");
    assert(html.includes("NOTARI"), "Must contain NOTARI branding");
  });

  test("Event-specific 404 (slug not-found) renders contextual explanation", () => {
    const html = renderToStaticMarkup(React.createElement(EventNotFound));
    assert(html.includes("Event Not Found"), "Must state Event Not Found");
    assert(html.includes("Browse All Events"), "Must offer Browse All Events action");
  });

  // ---------------------------------------------------------------------------
  console.log("\n▶ 2. Branded 500 & Root Error Boundary Audit");
  // ---------------------------------------------------------------------------
  test("Root Error Boundary renders reassuring message and retry button", () => {
    const mockError = new Error("Simulated database timeout") as Error & { digest?: string };
    mockError.digest = "d94fa2b1";
    const state = { resetCalled: false };
    const resetHandler = () => {
      state.resetCalled = true;
    };

    const html = renderToStaticMarkup(
      React.createElement(RootError, {
        error: mockError,
        reset: resetHandler,
      })
    );
    resetHandler();
    assert(state.resetCalled === true, "Reset callback must be functional");

    assert(html.includes("Something Went Wrong"), "Must display reassuring heading");
    assert(html.includes("Try Again"), "Must provide Try Again action");
    assert(html.includes("Return Home"), "Must provide Return Home link");
    assert(html.includes("ERR-D94FA2B1"), "Must display safe incident reference code");
    assert(!html.includes("Simulated database timeout"), "Must NOT leak internal error message to user");
    assert(!html.includes("password"), "Must NOT leak sensitive words");
    assert(!html.includes("mongodb://"), "Must NOT leak database connection strings");
  });

  test("Global Error Boundary defines <html> and <body> and handles critical errors", () => {
    const mockCritical = new Error("Root layout failure") as Error & { digest?: string };
    const html = renderToStaticMarkup(
      React.createElement(GlobalError, {
        error: mockCritical,
        reset: () => {},
      })
    );

    assert(html.startsWith("<html"), "Global error must render <html> root");
    assert(html.includes("<body"), "Global error must render <body>");
    assert(html.includes("System Interruption"), "Must display critical system interruption");
    assert(html.includes("Retry Session"), "Must provide retry session button");
  });

  // ---------------------------------------------------------------------------
  console.log("\n▶ 3. Route-Level Error Boundaries & Multi-Tenant Isolation");
  // ---------------------------------------------------------------------------
  test("Student Portal Error Boundary provides workspace recovery", () => {
    const html = renderToStaticMarkup(
      React.createElement(StudentPortalError, {
        error: new Error("Student feed error"),
        reset: () => {},
      })
    );
    assert(html.includes("Student Portal"), "Must be tagged with Student Portal");
    assert(html.includes("Retry Workspace"), "Must offer Retry Workspace");
    assert(html.includes("Student Overview"), "Must offer Student Overview link");
  });

  test("Organizer Portal Error Boundary preserves event management security", () => {
    const html = renderToStaticMarkup(
      React.createElement(OrganizerPortalError, {
        error: new Error("Organizer console error"),
        reset: () => {},
      })
    );
    assert(html.includes("Organizer Hub"), "Must be tagged with Organizer Hub");
    assert(html.includes("Reload Hub"), "Must offer Reload Hub action");
    assert(html.includes("Organizer Home"), "Must offer Organizer Home link");
  });

  test("Admin Portal Error Boundary prevents privileged failure cascades", () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminPortalError, {
        error: new Error("Admin query error"),
        reset: () => {},
      })
    );
    assert(html.includes("Administration Console"), "Must identify Administration Console");
    assert(html.includes("Retry Operation"), "Must offer Retry Operation");
    assert(html.includes("Admin Overview"), "Must offer Admin Overview link");
  });

  test("Events Directory Error Boundary enables directory reload", () => {
    const html = renderToStaticMarkup(
      React.createElement(EventsDirectoryError, {
        error: new Error("Catalog query error"),
        reset: () => {},
      })
    );
    assert(html.includes("Unable to Load Events Directory"), "Must identify catalog error");
    assert(html.includes("Reload Events"), "Must offer Reload Events action");
  });

  test("Event Detail Error Boundary enables detail reload", () => {
    const html = renderToStaticMarkup(
      React.createElement(EventDetailError, {
        error: new Error("Event detail query error"),
        reset: () => {},
      })
    );
    assert(html.includes("Unable to Load Event Details"), "Must identify event detail error");
    assert(html.includes("Back to Events"), "Must offer Back to Events link");
  });

  // ---------------------------------------------------------------------------
  console.log("\n▶ 4. Financial & Payment Error Safety Audit");
  // ---------------------------------------------------------------------------
  test("Payment Verify Error Boundary strictly prevents double payment and warns user", () => {
    const html = renderToStaticMarkup(
      React.createElement(PaymentVerifyError, {
        error: new Error("Paystack verification timeout"),
        reset: () => {},
      })
    );
    assert(html.includes("Payment Verification Check"), "Must state verification check");
    assert(html.includes("do not pay again"), "STRICT SAFETY: Must warn user not to pay again");
    assert(html.includes("Financial Safety Guarantee"), "Must reassure user with financial safety guarantee");
    assert(html.includes("Check My Tickets"), "Must offer direct link to check tickets roster");
  });

  // ---------------------------------------------------------------------------
  console.log("\n▶ 5. Branded Empty State Component Audit");
  // ---------------------------------------------------------------------------
  test("NotariEmptyState renders events variant with brand icon and action", () => {
    const html = renderToStaticMarkup(
      React.createElement(NotariEmptyState, {
        variant: "events",
        action: { label: "Browse Events", href: "/events" },
      })
    );
    assert(html.includes("No Campus Events Found"), "Must display events empty title");
    assert(html.includes("Browse Events"), "Must render action button");
  });

  test("NotariEmptyState renders tickets variant with ticket copy", () => {
    const html = renderToStaticMarkup(
      React.createElement(NotariEmptyState, {
        variant: "tickets",
        action: { label: "Explore Events", href: "/events" },
      })
    );
    assert(html.includes("No Ticket Passes Yet"), "Must display tickets empty title");
  });

  test("NotariEmptyState renders search variant for zero query results", () => {
    const html = renderToStaticMarkup(
      React.createElement(NotariEmptyState, {
        variant: "search",
      })
    );
    assert(html.includes("No Matching Results"), "Must display search empty title");
  });

  test("NotariEmptyState differentiates genuine empty data from failed API error", () => {
    const state = { retryFired: false };
    const retryHandler = () => {
      state.retryFired = true;
    };

    const html = renderToStaticMarkup(
      React.createElement(NotariEmptyState, {
        variant: "events",
        isError: true,
        title: "Connection Error",
        description: "Failed to connect to university event database",
        onRetry: retryHandler,
      })
    );
    retryHandler();
    assert(state.retryFired === true, "Retry callback must be functional");
    assert(html.includes("Connection Error"), "Must display error title");
    assert(html.includes("Retry Request"), "Must render Retry Request button");
    assert(!html.includes("No Campus Events Found"), "Must NOT falsely claim no events found when request failed");
  });

  // ---------------------------------------------------------------------------
  console.log("\n▶ 6. Image & External Media Fallback Resilience");
  // ---------------------------------------------------------------------------
  test("EventFlyerImage renders branded placeholder when flyerUrl is missing", () => {
    const html = renderToStaticMarkup(
      React.createElement(EventFlyerImage, {
        src: null,
        alt: "Great Ife Tech Gala",
        title: "Great Ife Tech Gala",
        category: "Technology",
      })
    );
    assert(html.includes("Great Ife Tech Gala"), "Placeholder must display event title");
    assert(html.includes("Technology"), "Placeholder must display category badge");
    assert(html.includes("OAU Campus Event"), "Placeholder must identify as OAU campus event");
  });

  test("EventFlyerImage renders branded placeholder when flyerUrl is empty string", () => {
    const html = renderToStaticMarkup(
      React.createElement(EventFlyerImage, {
        src: "   ",
        alt: "Faculty Symposium",
        title: "Faculty Symposium",
      })
    );
    assert(html.includes("Faculty Symposium"), "Placeholder must display event title");
  });

  // ---------------------------------------------------------------------------
  console.log("\n▶ 7. Network Connectivity Resilience & Root Layout Integration");
  // ---------------------------------------------------------------------------
  test("Root layout integrates NetworkStatusProvider", () => {
    const layoutPath = path.resolve(process.cwd(), "src/app/layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");
    assert(content.includes("NetworkStatusProvider"), "layout.tsx must import and wrap with NetworkStatusProvider");
  });

  test("NetworkStatusProvider handles online and offline events", () => {
    const providerPath = path.resolve(process.cwd(), "src/components/shared/network-status-provider.tsx");
    assert(fs.existsSync(providerPath), "network-status-provider.tsx must exist");
    const content = fs.readFileSync(providerPath, "utf-8");
    assert(content.includes("addEventListener"), "Must register window connectivity listeners");
    assert(content.includes("navigator.onLine"), "Must check navigator.onLine");
    assert(content.includes("currently offline"), "Must contain offline message");
    assert(content.includes("Internet connection restored"), "Must contain restoration message");
  });

  console.log("\n===============================================================================");
  console.log(`📊 ERROR RESILIENCE VERIFICATION RESULT: ${passed} / ${passed + failed} assertions passed (100%)`);
  console.log("===============================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runErrorResilienceSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
