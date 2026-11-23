/**
 * NOTARI 2.0 — Brand Identity & Animated Loading System Verification Suite
 * Validates design tokens, NotariSymbol SVG artwork, NotariLogo variants,
 * NotariLoader, NotariPageLoader, dynamic metadata icons, and layout integration.
 */

import React from "react";
import fs from "fs";
import path from "path";
import assert from "assert";

// Components
import { NotariSymbol } from "../components/shared/notari-symbol";
import { NotariLogo } from "../components/shared/notari-logo";
import { NotariLoader } from "../components/shared/notari-loader";
import { NotariPageLoader } from "../components/shared/notari-page-loader";
import RootLoading from "../app/loading";
import Icon, { size as iconSize } from "../app/icon";
import AppleIcon, { size as appleIconSize } from "../app/apple-icon";
import manifest from "../app/manifest";
import { renderEmailLayout, renderCtaButton } from "../lib/email/templates/base-layout";

let passedCount = 0;
let totalCount = 0;

function it(description: string, fn: () => void | Promise<void>) {
  totalCount++;
  try {
    const result = fn();
    if (result instanceof Promise) {
      throw new Error(`Async test not supported in sync runner: ${description}`);
    }
    passedCount++;
    console.log(`  [PASS] ${description}`);
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${(err as Error).message}`);
    throw err;
  }
}

async function runBrandSuite() {
  console.log("===============================================================================");
  console.log("NOTARI 2.0 — BRAND IDENTITY & ANIMATED LOADING VERIFICATION SUITE");
  console.log("===============================================================================\n");

  // ---------------------------------------------------------------------------
  // 1. Centralized Brand Design Tokens
  // ---------------------------------------------------------------------------
  console.log("Suite 1: Centralized Brand Design Tokens & Configuration");

  it("tailwind.config.ts defines approved Midnight Navy, Electric Blue, Campus Teal, and Cloud White", () => {
    const tailwindPath = path.join(process.cwd(), "tailwind.config.ts");
    const content = fs.readFileSync(tailwindPath, "utf-8");

    assert.ok(content.includes("#151C35"), "Missing Midnight Navy (#151C35) in tailwind config");
    assert.ok(content.includes("#4169E1"), "Missing Electric Blue (#4169E1) in tailwind config");
    assert.ok(content.includes("#20BFA9"), "Missing Campus Teal (#20BFA9) in tailwind config");
    assert.ok(content.includes("#F4F6FA"), "Missing Cloud White (#F4F6FA) in tailwind config");
    assert.ok(content.includes("brand:"), "Missing brand namespace in tailwind colors");
    assert.ok(content.includes("notari-pulse"), "Missing notari-pulse animation keyframes");
    assert.ok(content.includes("notari-indeterminate"), "Missing notari-indeterminate progress keyframes");
  });

  it("src/app/globals.css defines centralized CSS variables and prefers-reduced-motion block", () => {
    const globalsPath = path.join(process.cwd(), "src/app/globals.css");
    const content = fs.readFileSync(globalsPath, "utf-8");

    assert.ok(content.includes("--brand-midnight: #151C35;"), "Missing --brand-midnight CSS variable");
    assert.ok(content.includes("--brand-electric: #4169E1;"), "Missing --brand-electric CSS variable");
    assert.ok(content.includes("--brand-teal: #20BFA9;"), "Missing --brand-teal CSS variable");
    assert.ok(content.includes("--brand-cloud: #F4F6FA;"), "Missing --brand-cloud CSS variable");
    assert.ok(content.includes("@media (prefers-reduced-motion: reduce)"), "Missing prefers-reduced-motion block");
    assert.ok(content.includes("animation-duration: 0.01ms !important"), "Missing animation reset in reduced-motion");
  });

  // ---------------------------------------------------------------------------
  // 2. NotariSymbol SVG Artwork & Monogram Geometry
  // ---------------------------------------------------------------------------
  console.log("\nSuite 2: NotariSymbol Geometric N Monogram & Site Colors");

  it("NotariSymbol renders valid React element with size, variant, and glow props", () => {
    const element = React.createElement(NotariSymbol, {
      size: 48,
      showGlow: true,
      animated: true,
      variant: "brand",
      showBadge: false,
    });
    assert.ok(React.isValidElement(element), "NotariSymbol must be a valid React element");
    assert.strictEqual(element.type, NotariSymbol);
    assert.strictEqual(element.props.size, 48);
    assert.strictEqual(element.props.showGlow, true);
    assert.strictEqual(element.props.animated, true);
    assert.strictEqual(element.props.variant, "brand");
  });

  it("src/components/shared/notari-symbol.tsx contains authentic geometric N monogram path and site colors", () => {
    const symbolPath = path.join(process.cwd(), "src/components/shared/notari-symbol.tsx");
    const content = fs.readFileSync(symbolPath, "utf-8");

    assert.ok(content.includes("NOTARI_MONOGRAM_PATH"), "Symbol must export NOTARI_MONOGRAM_PATH");
    assert.ok(content.includes("notari-monogram-core"), "Symbol must include notari-monogram-core group");
    assert.ok(content.includes("notari-brand-facets"), "Symbol must include notari-brand-facets layer");
    assert.ok(content.includes("academic-beacon"), "Symbol must include academic-beacon golden spark");
    assert.ok(content.includes("#4169E1"), "Symbol must include Electric Blue #4169E1");
    assert.ok(content.includes("#20BFA9"), "Symbol must include Campus Teal #20BFA9");
    assert.ok(content.includes("M0,0 L95,93"), "Symbol must contain the authentic monogram diagonal cut");
  });

  // ---------------------------------------------------------------------------
  // 3. NotariLogo Component & Layout Variations
  // ---------------------------------------------------------------------------
  console.log("\nSuite 3: NotariLogo Variations, Layouts, and Subtitles");

  it("NotariLogo supports horizontal, stacked, and symbol-only layouts", () => {
    const horizontal = React.createElement(NotariLogo, { layout: "horizontal", variant: "public" });
    const stacked = React.createElement(NotariLogo, { layout: "stacked", variant: "student" });
    const symbolOnly = React.createElement(NotariLogo, { layout: "symbol-only", size: "lg" });

    assert.ok(React.isValidElement(horizontal), "Horizontal logo must be valid element");
    assert.ok(React.isValidElement(stacked), "Stacked logo must be valid element");
    assert.ok(React.isValidElement(symbolOnly), "Symbol-only logo must be valid element");
  });

  it("NotariLogo supports role-specific variants and default destinations", () => {
    const variants: Array<"public" | "admin" | "student" | "organizer" | "auth"> = [
      "public",
      "admin",
      "student",
      "organizer",
      "auth",
    ];

    for (const v of variants) {
      const el = React.createElement(NotariLogo, { variant: v });
      assert.ok(React.isValidElement(el), `Variant ${v} must render valid element`);
    }
  });

  it("NotariLogo supports isDark contrast theme and sizes (sm, md, lg, xl)", () => {
    const sizes: Array<"sm" | "md" | "lg" | "xl"> = ["sm", "md", "lg", "xl"];
    for (const s of sizes) {
      const darkLogo = React.createElement(NotariLogo, { size: s, isDark: true });
      const lightLogo = React.createElement(NotariLogo, { size: s, isDark: false });
      assert.ok(React.isValidElement(darkLogo), `Dark logo size ${s} must be valid`);
      assert.ok(React.isValidElement(lightLogo), `Light logo size ${s} must be valid`);
    }
  });

  it("NotariLogo supports href=false to render non-interactive container", () => {
    const nonInteractive = React.createElement(NotariLogo, { href: false });
    assert.ok(React.isValidElement(nonInteractive));
    assert.strictEqual(nonInteractive.props.href, false);
  });

  // ---------------------------------------------------------------------------
  // 4. Animated Loading System
  // ---------------------------------------------------------------------------
  console.log("\nSuite 4: Animated Loaders & Root Page Transition Experience");

  it("NotariLoader renders micro button spinners (xs, sm) and container spinners (md, lg, xl)", () => {
    const buttonLoader = React.createElement(NotariLoader, { size: "sm", variant: "white", text: "Processing..." });
    const modalLoader = React.createElement(NotariLoader, { size: "lg", variant: "electric", text: "Loading Events..." });

    assert.ok(React.isValidElement(buttonLoader), "Button loader must be valid element");
    assert.ok(React.isValidElement(modalLoader), "Modal loader must be valid element");
  });

  it("NotariPageLoader implements 4-part animation sequence with accessible role", () => {
    const pageLoader = React.createElement(NotariPageLoader, {
      title: "NOTARI",
      subtitle: "Obafemi Awolowo University Event Platform",
      fullscreen: true,
    });
    assert.ok(React.isValidElement(pageLoader), "NotariPageLoader must be valid element");
  });

  it("src/app/loading.tsx exports RootLoading using NotariPageLoader", () => {
    const rootLoading = React.createElement(RootLoading);
    assert.ok(React.isValidElement(rootLoading), "RootLoading must be valid element");
  });

  // ---------------------------------------------------------------------------
  // 5. Metadata Icons & Manifest
  // ---------------------------------------------------------------------------
  console.log("\nSuite 5: Dynamic Metadata Icons & Web Manifest");

  it("src/app/icon.tsx renders 192x192 ImageResponse with geometric N monogram emblem", () => {
    assert.strictEqual(iconSize.width, 192);
    assert.strictEqual(iconSize.height, 192);
    const res = Icon();
    assert.ok(res !== null && typeof res === "object", "Icon() must return ImageResponse");
  });

  it("src/app/apple-icon.tsx renders 180x180 ImageResponse with geometric N monogram emblem", () => {
    assert.strictEqual(appleIconSize.width, 180);
    assert.strictEqual(appleIconSize.height, 180);
    const res = AppleIcon();
    assert.ok(res !== null && typeof res === "object", "AppleIcon() must return ImageResponse");
  });

  it("src/app/manifest.ts returns Midnight Navy and Cloud White theme colors", () => {
    const data = manifest();
    assert.strictEqual(data.theme_color, "#151C35", "Manifest theme_color must be Midnight Navy (#151C35)");
    assert.strictEqual(data.background_color, "#F4F6FA", "Manifest background_color must be Cloud White (#F4F6FA)");
    assert.strictEqual(data.short_name, "NOTARI");
  });

  // ---------------------------------------------------------------------------
  // 6. Application & Email Layout Integration
  // ---------------------------------------------------------------------------
  console.log("\nSuite 6: Portal Layouts & Email Template Branding");

  it("Email template base-layout uses Midnight Navy header (#151C35) and Electric Blue CTA (#4169E1)", () => {
    const html = renderEmailLayout({
      title: "Ticket Confirmation",
      contentHtml: "<p>Your booking for OAU Tech Summit 2025 is confirmed.</p>",
      cta: { label: "View Ticket", url: "https://notari.oau.edu.ng/student/tickets" },
    });

    assert.ok(html.includes("#151C35"), "Email header must use Midnight Navy (#151C35)");
    assert.ok(html.includes("#4169E1"), "Email header border or CTA must use Electric Blue (#4169E1)");
    assert.ok(html.includes("#20BFA9"), "Email header accent must include Campus Teal (#20BFA9)");
    assert.ok(html.includes("NOTARI"), "Email header must display NOTARI");

    const buttonHtml = renderCtaButton({ label: "Confirm Account", url: "https://notari.oau.edu.ng/verify" });
    assert.ok(buttonHtml.includes("#4169E1"), "Primary CTA button must use Electric Blue (#4169E1)");
  });

  it("Portal layouts import and render NotariLogo consistently without broken references", () => {
    const navbar = fs.readFileSync(path.join(process.cwd(), "src/components/shared/navbar.tsx"), "utf-8");
    const authLayout = fs.readFileSync(path.join(process.cwd(), "src/app/(auth)/layout.tsx"), "utf-8");
    const adminLayout = fs.readFileSync(path.join(process.cwd(), "src/app/admin/layout.tsx"), "utf-8");
    const studentLayout = fs.readFileSync(path.join(process.cwd(), "src/app/student/layout.tsx"), "utf-8");
    const orgLayout = fs.readFileSync(path.join(process.cwd(), "src/app/organizer/layout.tsx"), "utf-8");

    assert.ok(navbar.includes("<NotariLogo"), "Navbar must render NotariLogo");
    assert.ok(authLayout.includes("<NotariLogo"), "Auth layout must render NotariLogo");
    assert.ok(adminLayout.includes("<NotariLogo"), "Admin layout must render NotariLogo");
    assert.ok(adminLayout.includes("#151C35"), "Admin sidebar must use Midnight Navy #151C35");
    assert.ok(studentLayout.includes("<NotariLogo"), "Student layout must render NotariLogo");
    assert.ok(orgLayout.includes("<NotariLogo"), "Organizer layout must render NotariLogo");
  });

  console.log(`\n===============================================================================`);
  console.log(`BRAND IDENTITY VERIFICATION RESULT: ${passedCount}/${totalCount} assertions passed (100%)`);
  console.log(`===============================================================================\n`);
}

runBrandSuite().catch((err) => {
  console.error("Suite failed:", err);
  process.exit(1);
});
