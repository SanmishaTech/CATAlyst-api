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
  if (v instanceof Date) {
    // Fix two-digit-style years that may come from ExcelJS Date parsing
    const y = v.getUTCFullYear();
    const m = v.getUTCMonth();
    const d = v.getUTCDate();
    if (y >= 0 && y < 100) {
      const year = 2000 + y;
      return new Date(Date.UTC(year, m, d));
    }
    return v;
  }

  // Excel serial number (days since 1899-12-30, with 1900 leap year bug)
  if (typeof v === "number" && isFinite(v)) {
    const serial = v;
    const excelEpoch = Date.UTC(1899, 11, 30);
    // Excel incorrectly treats 1900 as leap year: serial >= 60 are offset by +1 day
    const days = serial >= 60 ? serial - 1 : serial;
    const ms = excelEpoch + days * 24 * 60 * 60 * 1000;
    return new Date(ms);
  }

  const s = String(v).trim();
  const monthMap = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };

  // 1) 'DD Mon YY' with spaces, dashes or slashes, optional comma (e.g., '1 Jan 99', '1-Jan-99', '1/Jan/99', '1 Jan, 99')
  let m = s.match(/^(\d{1,2})[\s\/-]+([A-Za-z]{3}),?[\s\/-]+(\d{2})$/i);
  if (m) {
    const day = parseInt(m[1], 10);
    const monStr = m[2].toLowerCase();
    const yy = parseInt(m[3], 10);
    const month = monthMap[monStr];
    if (month !== undefined) {
      const year = 2000 + yy; // interpret 2-digit year as 20yy
      return new Date(Date.UTC(year, month, day));
    }
  }

  // 2) 'DD Mon YYYY' (e.g., '1 Jan 1999', '01-Jan-1999', '1 Jan, 1999')
  m = s.match(/^(\d{1,2})[\s\/-]+([A-Za-z]{3}),?[\s\/-]+(\d{4})$/i);
  if (m) {
    const day = parseInt(m[1], 10);
    const monStr = m[2].toLowerCase();
    const yyyy = parseInt(m[3], 10);
    const month = monthMap[monStr];
    if (month !== undefined) {
      return new Date(Date.UTC(yyyy, month, day));
    }
  }

  // 3) Numeric formats 'DD/MM/YY' or 'DD-MM-YY' or 'DD.MM.YY'
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const yy = parseInt(m[3], 10);
    if (month >= 0 && month <= 11) {
      const year = 2000 + yy;
      return new Date(Date.UTC(year, month, day));
    }
  }

  // 4) Numeric formats with 4-digit year 'DD/MM/YYYY'
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const yyyy = parseInt(m[3], 10);
    if (month >= 0 && month <= 11) {
      return new Date(Date.UTC(yyyy, month, day));
    }
  }

  // Fallback to native parser
  const ms = Date.parse(s);
  if (!isNaN(ms)) {
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    if (y >= 0 && y < 100) {
      return new Date(Date.UTC(2000 + y, d.getUTCMonth(), d.getUTCDate()));
    }
    return d;
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
              message: `Invalid date for ${field}: '${raw}'`,
            });
            return;
          }
          if (parsed !== undefined) {
            const y = parsed.getUTCFullYear();
            if (y < 1900 || y > 2200) {
              errors.push({
                row: rowNumber,
                field,
                message: `Out-of-range date year for ${field}: ${y} (expected 1900–2200)`,
              });
              return;
            }
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
      const result = await prisma.$transaction(async (tx) => {
        const r = await tx.uSBrokerDealer.createMany({ data: records });
        return r;
      });
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
