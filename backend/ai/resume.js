const fs = require("fs");
const path = require("path");
const { extractSkills } = require("./nlp");

/** Extract plain text from an uploaded PDF / DOCX / TXT. Returns "" if it can't be read. */
async function extractText(file) {
  if (!file) return "";
  const ext = path.extname(file.originalname || "").toLowerCase();
  try {
    const buf = fs.readFileSync(file.path);
    if (ext === ".pdf" || buf.slice(0, 4).toString() === "%PDF") {
      const pdfParse = require("pdf-parse");
      return ((await pdfParse(buf)).text || "").trim();
    }
    if (ext === ".docx") {
      const mammoth = require("mammoth");
      return ((await mammoth.extractRawText({ buffer: buf })).value || "").trim();
    }
    if (ext === ".txt" || ext === ".md") return buf.toString("utf8");
  } catch (e) {
    console.warn("[resume] text extraction failed:", e.message);
  }
  return "";
}

/** Heuristic structured parse used as the offline fallback (and to sanity-check LLM output). */
function localParse(text) {
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] || null;
  const phone = text.match(/(\+?\d[\d\s-]{8,}\d)/)?.[0]?.trim() || null;
  const cgpa = text.match(/cgpa[^0-9]{0,10}(\d{1,2}(?:\.\d{1,2})?)/i)?.[1] || null;
  const degree = text.match(/\b(B\.?\s?Tech|B\.?\s?E\.?|M\.?\s?Tech|MCA|BCA|B\.?\s?Sc|M\.?\s?Sc|MBA)\b/i)?.[0] || null;
  const years = [...text.matchAll(/(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience/gi)].map((m) => parseFloat(m[1]));
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const name = lines.find((l) => /^[A-Za-z][A-Za-z .'-]{2,40}$/.test(l) && l.split(" ").length <= 4) || null;
  return {
    name, email, phone, degree, cgpa,
    yearsExperience: years.length ? Math.max(...years) : 0,
    skills: extractSkills(text),
  };
}

/** Rule-based resume quality checks → actionable tips (always available). */
function localResumeTips(text, parsed) {
  const tips = [];
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 150) tips.push("Resume looks very short — add project details, tools used and outcomes.");
  if (words > 900) tips.push("Resume is long — keep it to one page for fresher roles.");
  if (!parsed.email) tips.push("No email address detected — recruiters need a way to contact you.");
  if (!/\bgithub\.com\//i.test(text)) tips.push("Add your GitHub link so recruiters can see your code.");
  if (!/\blinkedin\.com\//i.test(text)) tips.push("Add your LinkedIn profile link.");
  if (!/\d+\s?%|\d+\s?(users|ms|x|k\b)/i.test(text)) tips.push("Quantify impact with numbers (e.g. 'reduced load time by 40%').");
  if (!/\b(built|developed|designed|implemented|led|optimi[sz]ed)\b/i.test(text)) tips.push("Start bullet points with strong action verbs (built, designed, optimised…).");
  if (parsed.skills.length < 5) tips.push("Few technical skills detected — add a dedicated Skills section.");
  return tips;
}

module.exports = { extractText, localParse, localResumeTips };
