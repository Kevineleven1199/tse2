import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import { readFileSync } from "fs";

const prisma = new PrismaClient();

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length === 10) return digits;
  if (digits.length > 10) return digits.slice(-10);
  return digits.length >= 7 ? digits : null;
}

function parseCsv(text) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') { currentField += '"'; i++; } else { inQuotes = !inQuotes; }
      continue;
    }
    if (!inQuotes && char === ",") { currentRow.push(currentField.trim()); currentField = ""; continue; }
    if (!inQuotes && (char === "\n" || char === "\r")) {
      currentRow.push(currentField.trim()); currentField = "";
      if (currentRow.some(v => v.length > 0)) rows.push(currentRow);
      currentRow = [];
      if (char === "\r" && next === "\n") i++;
      continue;
    }
    currentField += char;
  }
  if (currentField || currentRow.length) {
    currentRow.push(currentField.trim());
    if (currentRow.some(v => v.length > 0)) rows.push(currentRow);
  }
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = row[i]?.trim() ?? ""; });
    return obj;
  });
}

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) { console.error("No tenant!"); process.exit(1); }
  const tenantId = tenant.id;
  console.log("Tenant:", tenantId, tenant.name);

  const existing = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, email: true, phone: true, firstName: true, lastName: true },
  });
  const existingEmails = new Set(existing.map(u => u.email.toLowerCase()));
  const existingPhones = new Set(existing.map(u => normalizePhone(u.phone)).filter(Boolean));
  console.log(`Existing DB contacts: ${existing.length}`);

  const importedPhones = new Set();
  const importedEmails = new Set();
  let created = 0, skipped = 0, dupes = 0, addresses = 0;

  // ── JOBBER ──
  console.log("\n=== JOBBER CUSTOMERS ===");
  const jobberRows = parseCsv(readFileSync("/Users/kevinflanagan/Downloads/1775089471_customers_all_time.csv", "utf-8"));
  console.log(`Parsed: ${jobberRows.length}`);

  for (const row of jobberRows) {
    const firstName = (row["First Name"] || row[" First Name"] || "").trim();
    const lastName = (row["Last Name"] || row[" Last Name"] || "").trim();
    if (!firstName && !lastName) { skipped++; continue; }
    if (firstName.toLowerCase().includes("test") && lastName.toLowerCase().includes("test")) { skipped++; continue; }
    if (firstName === "New" || firstName === "Admin") { skipped++; continue; }

    const email = (row["Email Address"] || row[" Email Address"] || "").toLowerCase().trim();
    const phone = (row["Phone Number"] || row[" Phone Number"] || "").trim();
    const normPhone = normalizePhone(phone);
    const note = (row["Note"] || row[" Note"] || "").trim();
    const rawAddress = (row["Address"] || row[" Address"] || "").trim();
    const city = (row["City"] || row[" City"] || "").trim();
    const state = (row["State"] || row[" State"] || "").trim();
    const zip = (row["Zip/Postal Code"] || row[" Zip/Postal Code"] || "").trim();
    const status = (row["Status"] || row[" Status"] || "Active").trim().toLowerCase();

    if (email && existingEmails.has(email)) { dupes++; continue; }
    if (normPhone && existingPhones.has(normPhone)) { dupes++; continue; }
    if (email && importedEmails.has(email)) { dupes++; continue; }
    if (normPhone && importedPhones.has(normPhone)) { dupes++; continue; }

    const contactEmail = email || `jobber-${Date.now()}-${Math.random().toString(36).slice(2,6)}@import.local`;
    try {
      await prisma.user.create({
        data: { tenantId, email: contactEmail, firstName, lastName, phone: phone || null, role: "CUSTOMER", status: status === "inactive" ? "inactive" : "active" },
      });
      const addressLine = rawAddress.split(",")[0]?.trim();
      if (addressLine && addressLine.length > 3) {
        try {
          await prisma.customerAddress.create({
            data: { tenantId, customerEmail: contactEmail, label: "Home", addressLine1: addressLine, city: city || "", state: state || "FL", postalCode: zip || "", isPrimary: true },
          });
          addresses++;
        } catch(e) {}
      }
      if (email) { importedEmails.add(email); existingEmails.add(email); }
      if (normPhone) { importedPhones.add(normPhone); existingPhones.add(normPhone); }
      created++;
    } catch(e) {
      if (e.code === "P2002") dupes++; else skipped++;
    }
  }
  console.log(`Jobber done: ${created} created, ${dupes} dupes, ${skipped} skipped, ${addresses} addresses`);

  // ── QUO / OPENPHONE ──
  const preQuo = { created, dupes, skipped };
  console.log("\n=== QUO (OPENPHONE) CONTACTS ===");
  const quoRows = parseCsv(readFileSync("/Users/kevinflanagan/Downloads/quo_contacts_export.csv", "utf-8"));
  console.log(`Parsed: ${quoRows.length}`);

  for (const row of quoRows) {
    const firstName = (row["First Name"] || "").trim();
    const lastName = (row["Last Name"] || "").trim();
    if (!firstName || firstName.length < 2) { skipped++; continue; }
    if (firstName === "New" && lastName.startsWith("Call")) { skipped++; continue; }

    const email = (row["Email"] || "").toLowerCase().trim();
    const phone = (row["Phone Number"] || "").trim();
    const normPhone = normalizePhone(phone);

    if (email && email.includes("@") && (existingEmails.has(email) || importedEmails.has(email))) { dupes++; continue; }
    if (normPhone && (existingPhones.has(normPhone) || importedPhones.has(normPhone))) { dupes++; continue; }

    const contactEmail = (email && email.includes("@")) ? email : `quo-${Date.now()}-${Math.random().toString(36).slice(2,6)}@import.local`;
    try {
      await prisma.user.create({
        data: { tenantId, email: contactEmail, firstName, lastName, phone: phone || null, role: "CUSTOMER", status: "active" },
      });
      if (email && email.includes("@")) { importedEmails.add(email); existingEmails.add(email); }
      if (normPhone) { importedPhones.add(normPhone); existingPhones.add(normPhone); }
      created++;
    } catch(e) {
      if (e.code === "P2002") dupes++; else skipped++;
    }
  }
  console.log(`Quo done: ${created - preQuo.created} created, ${dupes - preQuo.dupes} dupes, ${skipped - preQuo.skipped} skipped`);

  const finalCount = await prisma.user.count({ where: { tenantId, role: "CUSTOMER" } });
  console.log(`\n=== FINAL ===`);
  console.log(`Total created: ${created}`);
  console.log(`Total dupes skipped: ${dupes}`);
  console.log(`Total junk skipped: ${skipped}`);
  console.log(`Addresses created: ${addresses}`);
  console.log(`Total customers in DB now: ${finalCount}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
