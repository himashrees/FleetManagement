// const { Document } = require('../models');
// const { Op } = require('sequelize');
// const path = require('path');
// const fs   = require('fs');

// exports.getAll = async (req, res) => {
//   try {
//     const { vehicle_id, driver_id, type } = req.query;
//     const where = {};
//     if (vehicle_id) where.vehicle_id = vehicle_id;
//     if (driver_id)  where.driver_id  = driver_id;
//     if (type)       where.type       = type;
//     const docs = await Document.findAll({ where, order: [['expiry_date','ASC']] });
//     return res.json({ success: true, data: docs });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.upload = async (req, res) => {
//   try {
//     const file_path = req.file ? `/uploads/${req.file.filename}` : null;
//     const doc = await Document.create({ ...req.body, file_path });
//     return res.status(201).json({ success: true, data: doc });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.remove = async (req, res) => {
//   try {
//     const doc = await Document.findByPk(req.params.id);
//     if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
//     if (doc.file_path) {
//       const fullPath = path.join(__dirname, '../../', doc.file_path);
//       if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
//     }
//     await doc.destroy();
//     return res.json({ success: true, message: 'Deleted' });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.getExpiringDocuments = async (req, res) => {
//   try {
//     const thirtyDaysLater = new Date();
//     thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
//     const docs = await Document.findAll({
//       where: { expiry_date: { [Op.lte]: thirtyDaysLater } },
//       order: [['expiry_date','ASC']],
//     });
//     return res.json({ success: true, data: docs });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };



const os       = require('os');
const { Document } = require('../models');
const { Op }       = require('sequelize');
const path         = require('path');
const fs           = require('fs');
const { execSync } = require('child_process');
const Groq         = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
    const file_path = req.file ? `/uploads/${req.file.filename}` : null;
    const doc = await Document.create({ ...req.body, file_path });
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

exports.extractDates = async (req, res) => {
  const tmpPath = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    // 1. Write python script to proper temp dir
    const scriptPath = path.join(os.tmpdir(), `pdfext_${Date.now()}.py`);  // ← fixed
    fs.writeFileSync(scriptPath, `
import sys, json, pdfplumber
text = ""
with pdfplumber.open(sys.argv[1]) as pdf:
    for page in pdf.pages[:4]:
        t = page.extract_text()
        if t:
            text += t + "\\n"
print(json.dumps({"text": text[:6000]}))
`);

    let pdfText = '';
    try {
      const out = execSync(`python ${JSON.stringify(scriptPath)} ${JSON.stringify(tmpPath)}`, { timeout: 15000 });
      pdfText = JSON.parse(out.toString()).text || '';
    } finally {
      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
    }

    if (!pdfText.trim()) {
      return res.json({ success: false, message: 'No text found in PDF — may be a scanned image' });
    }

    // 2. Send to Groq
    const chat = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a document parser. Extract structured fields from document text and return only valid JSON. All dates must be in YYYY-MM-DD format. Return null for any field you cannot find.',
        },
        {
          role: 'user',
          content: `Extract these fields from the document below:
- issued_date: date the document was issued (YYYY-MM-DD or null)
- expiry_date: expiry / valid-to / valid-until date (YYYY-MM-DD or null)
- issuing_authority: organization or body that issued this document (string or null)
- title: short descriptive title e.g. "Vehicle Insurance – KA25AB1234" (string or null)

Document text:
---
${pdfText}
---`,
        },
      ],
    });

    const parsed = JSON.parse(chat.choices[0]?.message?.content || '{}');
    const validDate = (d) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);

    return res.json({
      success: true,
      data: {
        issued_date:       validDate(parsed.issued_date),
        expiry_date:       validDate(parsed.expiry_date),
        issuing_authority: parsed.issuing_authority || null,
        title:             parsed.title             || null,
      },
    });

  } catch (err) {
    console.error('[extract-dates]', err.message);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
};
