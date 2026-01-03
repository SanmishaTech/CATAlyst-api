const ExcelJS = require("exceljs");
const prisma = require("../config/db");
const fs = require("fs").promises;

const normalizeHeader = (h) =>
  (h ? String(h) : "").toLowerCase().replace(/[^a-z0-9]/g, "");

const headerMapping = {
  firmid: "firmId",
  firmname: "firmName",
  imid: "imid",
  crdid: "crdId",
  address: "address",
  taxid: "taxId",
  lei: "lei",
  validfrom: "validFrom",
  validto: "validTo",
  // Support headers with format hints
  validfrommmddyyyy: "validFrom",
  validtommddyyyy: "validTo",
  activeflag: "activeFlag",
  type: "type",
  account: "account",
  clearingaccount: "clearingAccount",
  clearingbroker: "clearingBroker",
  clearingtype: "clearingType",
  region: "region",
  brokerdealer: "brokerDealer",
  brokerdealeryn: "brokerDealer",
  affiliateflag: "affiliateFlag",
};

const booleanFields = new Set(["activeFlag", "brokerDealer", "affiliateFlag"]);
const dateFields = new Set(["validFrom", "validTo"]);

const fieldMaxLengths = {
  firmName: 255,
  imid: 64,
  crdId: 64,
  taxId: 64,
  lei: 64,
  type: 64,
  account: 128,
  clearingAccount: 128,
  clearingBroker: 128,
  clearingType: 64,
  region: 64,
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
  // Handle ExcelJS cell wrapper objects
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
  // Accept Excel Date objects (cells formatted as dates)
  if (v instanceof Date && !isNaN(v.valueOf())) {
    let y = v.getUTCFullYear();
    const m = v.getUTCMonth();
    const d = v.getUTCDate();
    if (y >= 0 && y < 100) y = 2000 + y;
    if (y > 2099) y = 2099;
    return new Date(Date.UTC(y, m, d));
  }
  // Accept Excel serial numbers
  if (typeof v === "number" && isFinite(v)) {
    const serial = v;
    const excelEpoch = Date.UTC(1899, 11, 30);
    const days = serial >= 60 ? serial - 1 : serial; // Excel's 1900 leap year bug
    const d = new Date(excelEpoch + days * 86400000);
    let y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const dd = d.getUTCDate();
    if (y >= 0 && y < 100) y = 2000 + y;
    if (y > 2099) y = 2099;
    return new Date(Date.UTC(y, m, dd));
  }
  if (typeof v !== "string") return undefined;
  const s = v.trim();

  // ISO YYYY-MM-DD or YYYY/MM/DD
  let iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    let year = parseInt(iso[1], 10);
    const month = parseInt(iso[2], 10) - 1;
    const day = parseInt(iso[3], 10);
    if (year > 2099) year = 2099;
    return new Date(Date.UTC(year, month, day));
  }

  // M/D/YYYY or MM/DD/YYYY
  let mdy = s.match(/^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(\d{4})$/);
  if (mdy) {
    const month = parseInt(mdy[1], 10) - 1;
    const day = parseInt(mdy[2], 10);
    let year = parseInt(mdy[3], 10);
    if (year > 2099) year = 2099;
    return new Date(Date.UTC(year, month, day));
  }

  // D/M/YYYY or DD/MM/YYYY or D-M-YYYY etc.
  let dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    let day = parseInt(dmy[1], 10);
    let month = parseInt(dmy[2], 10) - 1;
    let year = parseInt(dmy[3], 10);
    if (year > 2099) year = 2099;
    return new Date(Date.UTC(year, month, day));
  }

  // D Mon YY or D Mon YYYY (e.g., 1 Jan 99 or 1 January 2024)
  const dmon = s.match(/^\s*(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{2}|\d{4})\s*$/);
  if (dmon) {
    const day = parseInt(dmon[1], 10);
    const monStr = String(dmon[2]).trim().toLowerCase();
    const monthMap = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, sept: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11,
    };
    const month = monthMap[monStr];
    let year = parseInt(dmon[3], 10);
    if (String(dmon[3]).length === 2) year = 2000 + year;
    if (year > 2099) year = 2099;
    if (month !== undefined && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month, day));
    }
  }

  return undefined;
};

const parseFirmId = (v) => {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  const s = String(v).trim();
  if (!s) return undefined;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
};

const isEmptyRecord = (obj) => {
  const keys = Object.keys(obj).filter((k) => k !== "clientRefId");
  return keys.every(
    (k) => obj[k] === undefined || obj[k] === null || obj[k] === ""
  );
};

async function uploadFirmEntities(req, res, next) {
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

        if (field === "firmId") {
          const parsed = parseFirmId(raw);
          const present = !(raw === null || raw === undefined || raw === "");
          if (present && parsed === undefined) {
            errors.push({
              row: rowNumber,
              field,
              message: `Invalid integer for ${field}: '${raw}'`,
            });
            return;
          }
          if (parsed !== undefined) rec[field] = parsed;
          return;
        }

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

        if (dateFields.has(field)) {
          const rawStr = typeof raw === "string" ? raw.trim() : "";
          const displayFull =
            cell && typeof cell.text === "string" ? cell.text.trim() : "";

          // Any non-empty value triggers parsing (field is optional, not required)
          const present = !(
            (raw === null || raw === undefined || raw === "") &&
            displayFull === ""
          );
          if (!present) return;

          // 1) Try parsing raw value directly (handles Excel Date/serial and multiple string formats)
          const parsedRaw = parseDate(raw);
          if (parsedRaw !== undefined) {
            rec[field] = parsedRaw;
            return;
          }

          // 2) Try parsing the full display text directly
          const parsedDisplay = parseDate(displayFull);
          if (parsedDisplay !== undefined) {
            rec[field] = parsedDisplay;
            return;
          }

          // 3) As a last resort, extract a date-like substring from display and parse
          const numericAnywhere = displayFull.match(
            /(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(\d{2,4})/
          );
          if (numericAnywhere) {
            const mm = parseInt(numericAnywhere[1], 10) - 1;
            const dd = parseInt(numericAnywhere[2], 10);
            let yy = parseInt(numericAnywhere[3], 10);
            if (String(numericAnywhere[3]).length === 2) yy = 2000 + yy;
            if (yy > 2099) yy = 2099;
            rec[field] = new Date(Date.UTC(yy, mm, dd));
            return;
          }
          const dMonAnywhere = displayFull.match(
            /(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{2,4})/
          );
          if (dMonAnywhere) {
            const day = parseInt(dMonAnywhere[1], 10);
            const monStr = String(dMonAnywhere[2]).trim().toLowerCase();
            const monthMap = {
              jan: 0, january: 0,
              feb: 1, february: 1,
              mar: 2, march: 2,
              apr: 3, april: 3,
              may: 4,
              jun: 5, june: 5,
              jul: 6, july: 6,
              aug: 7, august: 7,
              sep: 8, sept: 8, september: 8,
              oct: 9, october: 9,
              nov: 10, november: 10,
              dec: 11, december: 11,
            };
            const month = monthMap[monStr];
            let year = parseInt(dMonAnywhere[3], 10);
            if (String(dMonAnywhere[3]).length === 2) year = 2000 + year;
            if (year > 2099) year = 2099;
            if (month !== undefined && day >= 1 && day <= 31) {
              rec[field] = new Date(Date.UTC(year, month, day));
            }
          }
          return;
        }

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
        if (rec.firmId === undefined || rec.firmId === null) {
          errors.push({
            row: rowNumber,
            field: "firmId",
            message: "FirmID is required",
          });
          return;
        }
        records.push(rec);
      }
    });

    if (errors.length > 0) {
      console.error("Firm Entity import validation errors:", errors);
      return res.status(400).json({
        errors: {
          message: "Validation failed for one or more rows",
          details: errors,
        },
      });
    }

    let inserted = 0;
    if (records.length > 0) {
      const result = await prisma.firmEntity.createMany({ data: records });
      inserted = result.count || 0;
    }

    return res.status(201).json({
      message: "FirmEntity records imported successfully",
      total: records.length,
      inserted,
      failed: Math.max(0, records.length - inserted),
      errors: [],
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
  uploadFirmEntities,
};
