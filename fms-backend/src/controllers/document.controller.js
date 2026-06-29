const os       = require('os');
const { Document } = require('../models');
const { Op }       = require('sequelize');
const path         = require('path');
const fs           = require('fs');
const { execSync } = require('child_process');
const Groq         = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const TEXT_MODEL   = process.env.GROQ_TEXT_MODEL   || 'llama-3.3-70b-versatile';
const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-maverick-17b-128e-instruct';

const IMAGE_EXTS  = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const MIME_BY_EXT = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

function extOf(filename) {
  return (filename.split('.').pop() || '').toLowerCase();
}

// ── Updated prompt — now also extracts doc_type, entity_type, and entity identifiers ──
const EXTRACTION_FIELDS_PROMPT = `You are reading a document (insurance certificate, vehicle registration, permit, license, or similar) belonging to a fleet management system.
Extract ONLY these ten fields and return valid JSON with exactly these keys:
{
  "issued_date":       "YYYY-MM-DD or null",
  "expiry_date":       "YYYY-MM-DD or null",
  "issuing_authority": "name of the organisation that issued this document, or null",
  "title":             "short descriptive title like Vehicle Insurance KA01AB1234, or null",
  "document_no":       "the document/certificate/policy number printed on the document, or null",
  "notes":             "one short sentence summarising the key details (vehicle number, policy type, insured name), or null",
  "doc_type":          "one of: insurance, registration, permit, license, pollution, other",
  "entity_type":       "vehicle if the document belongs to a vehicle, driver if it belongs to a person, or null if unclear",
  "registration_no":   "the vehicle registration / number plate this document refers to (e.g. KA01AB1234), or null if not a vehicle document",
  "driver_name":       "the full name of the person this document refers to (license holder, insured driver, etc.), or null if not a driver document"
}
Rules:
- All dates MUST be in YYYY-MM-DD format. Convert DD/MM/YYYY or any other format.
- document_no: look for fields labelled Policy No, Certificate No, Registration No, Permit No, Licence No, Document No, Reference No, or similar.
- doc_type: classify based on the document's purpose — e.g. an insurance certificate is "insurance", an RC book or registration certificate is "registration", a driving licence is "license", a pollution/emission certificate is "pollution", a permit document is "permit". Use "other" only if none of these fit.
- entity_type: a driving license or a driver's medical/ID document is "driver". A vehicle's RC, insurance, permit, or pollution certificate is "vehicle".
- registration_no: normalise to remove extra spaces (e.g. "KA 01 AB 1234" -> "KA01AB1234"). Only fill this if entity_type is "vehicle".
- driver_name: only fill this if entity_type is "driver".
- notes: summarise in ONE sentence only — include the most important detail such as vehicle registration number, policyholder name, or covered period.
- If you cannot find a field, set it to null.
- Return ONLY the JSON object, no explanation, no markdown fences.`;

function parseExtractionResult(content) {
  try {
    const clean = (content || '').replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    const validDate = (d) => {
      if (!d) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      const dt = new Date(d);
      if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
      return null;
    };
    const VALID_DOC_TYPES = ['insurance', 'registration', 'permit', 'license', 'pollution', 'other'];
    const docType = (parsed.doc_type || '').toLowerCase().trim();
    const entityType = (parsed.entity_type || '').toLowerCase().trim();
    return {
      issued_date:       validDate(parsed.issued_date),
      expiry_date:       validDate(parsed.expiry_date),
      issuing_authority: parsed.issuing_authority || null,
      title:             parsed.title             || null,
      document_no:       parsed.document_no       || null,
      notes:             parsed.notes             || null,
      doc_type:          VALID_DOC_TYPES.includes(docType) ? docType : null,
      entity_type:       ['vehicle', 'driver'].includes(entityType) ? entityType : null,
      registration_no:   parsed.registration_no ? String(parsed.registration_no).replace(/\s+/g, '').toUpperCase() : null,
      driver_name:       parsed.driver_name || null,
    };
  } catch {
    return { issued_date: null, expiry_date: null, issuing_authority: null, title: null, document_no: null, notes: null, doc_type: null, entity_type: null, registration_no: null, driver_name: null };
  }
}

/* ── Python helpers ──────────────────────────────────────────────────────── */
const PDF_TEXT_SCRIPT = `
import sys, json
try:
    import pdfplumber
    text = ""
    with pdfplumber.open(sys.argv[1]) as pdf:
        for page in pdf.pages[:4]:
            t = page.extract_text()
            if t:
                text += t + "\\n"
    print(json.dumps({"text": text[:8000]}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

const PDF_IMAGE_SCRIPT = `
import sys, json, base64, os
try:
    from pdf2image import convert_from_path
    from PIL import Image
    import io
    pages = convert_from_path(sys.argv[1], dpi=200, first_page=1, last_page=2)
    images = []
    for page in pages:
        w, h = page.size
        if w > 1600:
            ratio = 1600 / w
            page = page.resize((int(w*ratio), int(h*ratio)), Image.LANCZOS)
        buf = io.BytesIO()
        page.save(buf, format='JPEG', quality=85)
        images.append(base64.b64encode(buf.getvalue()).decode())
    print(json.dumps({"images": images}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

function runPython(script, args, timeout = 30000) {
  const scriptPath = path.join(os.tmpdir(), `fms_${Date.now()}.py`);
  fs.writeFileSync(scriptPath, script);
  try {
    const argStr = args.map(a => JSON.stringify(a)).join(' ');
    const out = execSync(`python3 ${JSON.stringify(scriptPath)} ${argStr}`, { timeout });
    return JSON.parse(out.toString().trim());
  } finally {
    try { fs.unlinkSync(scriptPath); } catch {}
  }
}

/* ══ CRUD ════════════════════════════════════════════════════════════════════ */
exports.getAll = async (req, res) => {
  try {
    const { vehicle_id, driver_id, type } = req.query;
    const where = {};
    if (vehicle_id) where.vehicle_id = vehicle_id;
    if (driver_id)  where.driver_id  = driver_id;
    if (type)       where.type       = type;
    const docs = await Document.findAll({ where, order: [['expiry_date', 'ASC']] });
    return res.json({ success: true, data: docs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a document first.' });
    }
    const { title, type, vehicle_id, driver_id, issued_date, expiry_date, issuing_authority, notes, document_no } = req.body;
    if (!type) {
      return res.status(400).json({ success: false, message: 'Document type is required.' });
    }
    const doc = await Document.create({
      title,
      type,
      vehicle_id:        vehicle_id        || null,
      driver_id:         driver_id         || null,
      issued_date:       issued_date       || null,
      expiry_date:       expiry_date       || null,
      issuing_authority: issuing_authority || null,
      document_no:       document_no       || null,
      notes:             notes             || null,
      file_path:         `/uploads/${req.file.filename}`,
    });
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    if (doc.file_path) {
      const fullPath = path.join(__dirname, '../../', doc.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    await doc.destroy();
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getExpiringDocuments = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(now.getDate() + 30);
    const docs = await Document.findAll({
      where: { expiry_date: { [Op.gt]: now, [Op.lte]: thirtyDaysLater } },
      order: [['expiry_date', 'ASC']],
    });
    return res.json({ success: true, data: docs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ══ EXTRACT DATES ══════════════════════════════════════════════════════════ */
exports.extractDates = async (req, res) => {
  const tmpPath = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }
    if (!process.env.GROQ_API_KEY) {
      return res.json({ success: false, message: 'AI extraction not configured — add GROQ_API_KEY to .env' });
    }

    const ext = extOf(req.file.originalname);

    if (IMAGE_EXTS.includes(ext)) {
      return await extractFromImageFile(res, tmpPath, ext);
    }

    return await extractFromPdf(res, tmpPath);

  } catch (err) {
    console.error('[extract-dates] unexpected error:', err.message);
    return res.json({ success: false, message: 'Extraction failed — please fill details manually' });
  } finally {
    if (tmpPath) { try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch {} }
  }
};

// A text-extraction pass is only "successful" if it actually found something —
// otherwise we should fall through to the vision pipeline instead of giving up.
function hasUsefulData(data) {
  return Boolean(
    data.title || data.expiry_date || data.issued_date || data.document_no ||
    data.issuing_authority || data.registration_no || data.driver_name
  );
}

async function extractFromPdf(res, tmpPath) {
  let pdfText = '';

  // Step 0: pdf-parse (Node native)
  try {
    const pdfParse = require('pdf-parse');
    const buffer   = fs.readFileSync(tmpPath);
    const data     = await pdfParse(buffer);
    pdfText        = (data.text || '').trim().slice(0, 8000);
  } catch (err) {
    console.warn('[extract-dates:pdf-parse] failed:', err.message);
  }

  // Step 1: raw buffer text extraction
  if (!pdfText || pdfText.length < 30) {
    try {
      const buf = fs.readFileSync(tmpPath);
      const raw = buf.toString('latin1');
      const strings = raw.match(/[\x20-\x7E]{4,}/g) || [];
      pdfText = strings.join(' ').slice(0, 8000);
    } catch (err) {
      console.warn('[extract-dates:raw] failed:', err.message);
    }
  }

  // Step 2: pdfplumber Python fallback
  if (!pdfText || pdfText.length < 30) {
    try {
      const result = runPython(PDF_TEXT_SCRIPT, [tmpPath]);
      if (!result.error) pdfText = (result.text || '').trim();
    } catch (err) {
      console.warn('[extract-dates:pdfplumber] failed:', err.message);
    }
  }

  // Step 3: Groq text model — only treat this as done if it actually extracted something.
  // Scanned/image-based PDFs (e.g. a driving licence with a photo and a thin layer of
  // boilerplate template text) can clear the length check above without containing any
  // of the fields we care about, in which case we want to fall through to vision below
  // instead of returning an all-null result.
  if (pdfText && pdfText.length > 30) {
    try {
      const chat = await groq.chat.completions.create({
        model:           TEXT_MODEL,
        temperature:     0,
        max_tokens:      500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: EXTRACTION_FIELDS_PROMPT },
          { role: 'user',   content: `Document text:\n---\n${pdfText}\n---` },
        ],
      });
      const data = parseExtractionResult(chat.choices[0]?.message?.content);
      if (hasUsefulData(data)) {
        return res.json({ success: true, data });
      }
      console.warn('[extract-dates:groq] text pass found no usable fields — falling back to vision');
    } catch (err) {
      console.error('[extract-dates:groq]', err.message);
    }
  }

  // Step 4: vision fallback
  let images = [];
  try {
    const result = runPython(PDF_IMAGE_SCRIPT, [tmpPath], 60000);
    if (!result.error) images = result.images || [];
  } catch (err) {
    console.warn('[extract-dates:pdf2image] failed:', err.message);
  }

  if (images.length > 0) {
    return await extractFromBase64Image(res, images[0], 'image/jpeg');
  }

  return res.json({ success: false, message: 'Could not read this PDF — please fill details manually' });
}

async function extractFromImageFile(res, tmpPath, ext) {
  const base64 = fs.readFileSync(tmpPath).toString('base64');
  const mime   = MIME_BY_EXT[ext] || 'image/jpeg';
  return await extractFromBase64Image(res, base64, mime);
}

async function extractFromBase64Image(res, base64, mime) {
  try {
    const chat = await groq.chat.completions.create({
      model:       VISION_MODEL,
      temperature: 0,
      max_tokens:  500,
      messages: [
        {
          role:    'user',
          content: [
            { type: 'text',      text: EXTRACTION_FIELDS_PROMPT },
            { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
          ],
        },
      ],
    });
    const data = parseExtractionResult(chat.choices[0]?.message?.content);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[extract-dates:vision:groq]', err.message);
    return res.json({ success: false, message: 'AI could not read this document — please fill details manually' });
  }
}