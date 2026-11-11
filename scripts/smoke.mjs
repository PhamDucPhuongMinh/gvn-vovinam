import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("Smoke test only runs against local demo servers.");
let cookie = "";
async function get(p, options = {}) {
  return fetch(base + p, {
    redirect: "manual",
    ...options,
    headers: {
      Origin: base,
      Cookie: cookie,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}
const anonymous = await get("/api/admin");
assert.equal(anonymous.status, 401);
const redirect = await get("/admin");
assert.equal(redirect.status, 307);
assert.ok(redirect.headers.get("location")?.includes("/login"));
const homepage = await get("/");
assert.equal(homepage.status, 200);
const html = await homepage.text();
assert.ok(html.includes("Khỏe thể chất"));
assert.ok(!html.includes("Synthetic learner"));
const publicResponse = await get("/api/public");
const published = await publicResponse.json();
assert.ok(!("students" in published));
assert.ok(!("entries" in published));
assert.ok(!("monthlyFee" in published.settings));
const invalidOrigin = await get("/api/auth/login", {
  method: "POST",
  headers: { Origin: "https://other.example" },
  body: JSON.stringify({ username: "admin", password: "demo12345" }),
});
assert.equal(invalidOrigin.status, 400);
const wrong = await get("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ username: "admin", password: "wrong" }),
});
assert.equal(wrong.status, 401);
const login = await get("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ username: "admin", password: "demo12345" }),
});
assert.equal(login.status, 200);
const setCookie = login.headers.get("set-cookie");
assert.ok(setCookie.includes("HttpOnly"));
assert.match(setCookie, /SameSite=Strict/i);
cookie = setCookie.split(";")[0];
const admin = await get("/api/admin");
assert.equal(admin.status, 200);
const payload = await admin.json();
assert.equal(payload.demo, true);
assert.equal(payload.state.students.length, 0);
const page = await get("/admin");
assert.equal(page.status, 200);
const invalid = await get("/api/register", {
  method: "POST",
  body: JSON.stringify({
    name: "Test",
    phone: "bad",
    studentName: "Test",
    age: 4,
    notes: "",
    website: "",
    consent: true,
  }),
});
assert.equal(invalid.status, 400);
const marker = "QA synthetic " + crypto.randomUUID();
const lead = await get("/api/register", {
  method: "POST",
  body: JSON.stringify({
    name: marker,
    phone: "0900000000",
    studentName: "Synthetic learner",
    age: 7,
    notes: "Local smoke test only",
    website: "",
    consent: true,
  }),
});
assert.equal(lead.status, 200);
const updated = await (await get("/api/admin")).json();
assert.ok(updated.state.leads.some((l) => l.name === marker));
// Remove only this generated QA record from the local demo file; retain all other changes.
const file = new URL("../.data/club.json", import.meta.url);
const local = JSON.parse(await readFile(file, "utf8"));
local.leads = local.leads.filter((l) => l.name !== marker);
await writeFile(file, JSON.stringify(local));
const logout = await get("/api/auth/logout", { method: "POST" });
assert.equal(logout.status, 200);
assert.match(
  logout.headers.get("set-cookie"),
  /Max-Age=0|Expires=Thu, 01 Jan 1970/i,
);
cookie = "";
assert.equal((await get("/api/admin")).status, 401);
console.log(
  "PASS: public/private data boundary, redirects, origin checks, login/cookies, registration persistence and logout. Synthetic lead removed.",
);
