const ExcelJS = require("exceljs");
const prisma = require("../config/db");
const path = require("path");
const fs = require("fs").promises;

const normalizeHeader = (h) =>
  (h ? String(h) : "").toLowerCase().replace(/[^a-z0-9]/g, "");

const headerMapping = {
  clientid: "clientId",
  firmname: "firmName",
  imid: "imid",
  crdid: "crdId",
  exchangeid: "exchangeId",
  foreignbrokerdealer: "foreignBrokerDealer",
  micvalue: "micValue",
  address: "address",
  taxid: "taxId",
  lei: "lei",
  validfrom: "validFrom",
  validto: "validTo",
  activeflag: "activeFlag",
  membershiptype: "membershipType",
  account: "account",
  clearingaccount: "clearingAccount",
  clearingbroker: "clearingBroker",
  clearingtype: "clearingType",
  region: "region",
  brokerdealer: "brokerDealer",
  // Support Excel header variant 'BrokerDealer (Y/N)'
  brokerdealeryn: "brokerDealer",
  atsflag: "atsFlag",
  defaultimidflag: "defaultImidFlag",
  destinationcode: "destinationCode",
};

const booleanFields = new Set([
  "foreignBrokerDealer",
  "activeFlag",
  "brokerDealer",
  "atsFlag",
  "defaultImidFlag",
]);

const dateFields = new Set(["validFrom", "validTo"]);

// Max lengths aligned with Prisma schema constraints
const fieldMaxLengths = {
  clientId: 128,
  firmName: 255,
  imid: 64,
  crdId: 64,
  exchangeId: 64,
  micValue: 32,
  taxId: 64,
  lei: 64,
  membershipType: 64,
  account: 128,
  clearingAccount: 128,
  clearingBroker: 128,
  clearingType: 64,
  region: 64,
  destinationCode: 64,
};

const parseBoolean = (v) => {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(s)) return true;
  if (["false", "no", "n", "0"].includes(s)) return false;
  return undefined;
};

const parseDate = (v) => {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "object" && !(v instanceof Date)) {
    if (v && typeof v.result !== "undefined") return parseDate(v.result);
    if (v && typeof v.text === "string") return parseDate(v.text);
    if (v && Array.isArray(v.richText)) {
      const t = v.richText
        .map((p) => (p && typeof p.text === "string" ? p.text : ""))
        .join("")
        .trim();
      if (t) return parseDate(t);
    }
  }
  // If ExcelJS already parsed as Date
  if (v instanceof Date) {
    const y = v.getUTCFullYear();
    const m = v.getUTCMonth();
    const d = v.getUTCDate();
    if (y >= 0 && y < 100) return new Date(Date.UTC(2000 + y, m, d));
    return v;
  }
  // If Excel serial number
  if (typeof v === "number" && isFinite(v)) {
    const serial = v;
    const excelEpoch = Date.UTC(1899, 11, 30);
    const days = serial >= 60 ? serial - 1 : serial;
    return new Date(excelEpoch + days * 86400000);
  }
  // Strict MM/DD/YYYY for strings
  const s = String(v).trim();

  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    const year = parseInt(iso[1], 10);
    const month = parseInt(iso[2], 10) - 1;
    const day = parseInt(iso[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month, day));
    }
  }

  const m = s.match(
    /^([0][1-9]|1[0-2]|[1-9])\/([0][1-9]|[12][0-9]|3[01]|[1-9])\/(\d{4})$/
  );
  if (m) {
    const month = parseInt(m[1], 10) - 1;
    const day = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    if (month >= 0 && month <= 11) return new Date(Date.UTC(year, month, day));
  }

  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    let day = parseInt(dmy[1], 10);
    let month = parseInt(dmy[2], 10) - 1;
    const year = parseInt(dmy[3], 10);
    if (month > 11 && day >= 1 && day <= 12) {
      const tmp = day;
      day = month + 1;
      month = tmp - 1;
    }
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month, day));
    }
  }

  const dmon = s.match(/^\s*(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{2}|\d{4})\s*$/);
  if (dmon) {
    const day = parseInt(dmon[1], 10);
    const monStr = String(dmon[2]).trim().toLowerCase();
    const monthMap = {
      jan: 0,
      january: 0,
      feb: 1,
      february: 1,
      mar: 2,
      march: 2,
      apr: 3,
      april: 3,
      may: 4,
      jun: 5,
      june: 5,
      jul: 6,
      july: 6,
      aug: 7,
      august: 7,
      sep: 8,
      sept: 8,
      september: 8,
      oct: 9,
      october: 9,
      nov: 10,
      november: 10,
      dec: 11,
      december: 11,
    };
    const month = monthMap[monStr];
    let year = parseInt(dmon[3], 10);
    if (String(dmon[3]).length === 2) year = 2000 + year;
    if (month !== undefined && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month, day));
    }
  }

  return undefined;
};

const isEmptyRecord = (obj) => {
  const keys = Object.keys(obj).filter((k) => k !== "clientRefId");
  return keys.every(
    (k) => obj[k] === undefined || obj[k] === null || obj[k] === ""
  );
};

async function uploadUSBrokerDealers(req, res, next) {
  const clientId = parseInt(req.params.id);
  let filePath;
  try {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return res.status(404).json({ errors: { message: "Client not found." } });
    }

    if (!req.file) {
      return res.status(400).json({
        errors: { message: "No file uploaded. Use field name 'file'." },
      });
    }

    filePath = req.file.path;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      await fs.unlink(filePath).catch(() => {});
      return res
        .status(400)
        .json({ errors: { message: "Excel file is empty or invalid." } });
    }

    const headers = [];
    worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell) => {
      headers.push(normalizeHeader(cell.value));
    });

    const colToField = {};
    headers.forEach((h, idx) => {
      if (headerMapping[h]) {
        colToField[idx + 1] = headerMapping[h];
      }
    });

    const records = [];
    const errors = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rec = { clientRefId: clientId };

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const field = colToField[colNumber];
        if (!field) return;
        const raw = cell.value;

        // Boolean validation: non-empty but unparsable -> error
        if (booleanFields.has(field)) {
          const parsed = parseBoolean(raw);
          const present = !(raw === null || raw === undefined || raw === "");
          if (present && parsed === undefined) {
            errors.push({
              row: rowNumber,
              field,
              message: `Invalid boolean for ${field}: '${raw}' (expected true/false, yes/no, y/n, 1/0)`,
            });
            return;
          }
          if (parsed !== undefined) rec[field] = parsed;
          return;
        }

        // Date validation: non-empty but unparsable -> error
        if (dateFields.has(field)) {
          const parsed = parseDate(raw);
          const present = !(raw === null || raw === undefined || raw === "");
          if (present && parsed === undefined) {
            errors.push({
              row: rowNumber,
              field,
              message: `Invalid date for ${field}: '${raw}' (expected Excel date, MM/DD/YYYY, DD-MMM-YY, DD-MM-YYYY, or YYYY-MM-DD)`,
            });
            return;
          }
          if (parsed !== undefined) {
            rec[field] = parsed;
          }
          return;
        }

        // String fields: coerce and validate length
        if (raw !== null && raw !== undefined && raw !== "") {
          const str = String(raw);
          const max = fieldMaxLengths[field];
          if (max && str.length > max) {
            errors.push({
              row: rowNumber,
              field,
              message: `Value too long for ${field} (max ${max}): length ${str.length}`,
            });
            return;
          }
          rec[field] = str;
        }
      });

      if (!isEmptyRecord(rec)) {
        records.push(rec);
      }
    });

    // If any validation errors were found, abort without inserting
    if (errors.length > 0) {
      // Log detailed validation errors to server console
      // eslint-disable-next-line no-console
      console.error("US Broker Dealer import validation errors:", errors);
      return res.status(400).json({
        errors: {
          message: "Validation failed for one or more rows",
          details: errors,
        },
      });
    }

    let inserted = 0;
    if (records.length > 0) {
      // All-or-nothing insert
      const result = await prisma.uSBrokerDealer.createMany({ data: records });
      inserted = result.count || 0;
    }

    return res.status(201).json({
      message: "USBrokerDealer records imported successfully",
      total: records.length,
      inserted,
      failed: Math.max(0, records.length - inserted),
      errors,
    });
  } catch (err) {
    return next(err);
  } finally {
    if (filePath) {
      await fs.unlink(filePath).catch(() => {});
    }
  }
}

module.exports = {
  uploadUSBrokerDealers,
};
