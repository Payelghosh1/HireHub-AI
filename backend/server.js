require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { q, ready } = require("./db");
const auth = require("./auth");
const aiRoutes = require("./ai/aiRoutes");
const resumeTools = require("./ai/resume");
const nlp = require("./ai/nlp");
const ml = require("./ai/ml");

const app = express();
const PORT = process.env.PORT || 5001;
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true }));
app.use(express.json({ limit: "1mb" }));

const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 5 * 1024 * 1024 } });
const otps = new Map();
const safeUser = (u) => ({ id: u.id, name: u.name, contact: u.contact, role: u.role });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const toSkills = (v) => (Array.isArray(v) ? v : String(v || "").split(",")).map((s) => s.trim()).filter(Boolean);

// ---------- seed catalogue (first run only) ----------
function seed() {
  if (q.jobCount() > 0) return;
  const originals = require("./data/jobs");
  const generated = require("./data/dataset/jobs.json");
  const days = (s) => 86400000 * (parseInt(s) || 1);
  const reqs = (j) => (j.skills || []).slice(0, 4).map((s) => `• Working knowledge of ${s}`).join("\n") + "\n• Good problem-solving and communication skills";
  [...originals, ...generated].forEach((j, i) => q.createJob({ ...j, education: j.education || "B.Tech", requirements: j.requirements || reqs(j) }, null, j.postedBy || "HireHub", Date.now() - days(j.postedDate) - i * 1000));
  console.log(`[db] seeded ${q.jobCount()} jobs`);
}

// Demo accounts + sample applicants so a fresh install has something to show (disable with SEED_DEMO=false).
function seedDemo() {
  if (process.env.SEED_DEMO === "false" || q.userByContact("recruiter@demo.com")) return;
  const hash = bcrypt.hashSync("demo1234", 10);
  const recId = q.createUser({ name: "Priya Recruiter", contact: "recruiter@demo.com", hash, role: "recruiter" });
  q.createUser({ name: "Payel Das", contact: "payel@demo.com", hash, role: "candidate" });
  const jobId = q.createJob({ title: "Machine Learning Engineer", company: "HireHub Labs", location: "Remote", type: "Full Time", salary: "₹12–20 LPA", experience: "0–2 years", education: "B.Tech", subject: "CSE / IT", cgpa: "7", skills: ["Python", "Machine Learning", "TensorFlow", "Pandas"], requirements: "• Python and ML fundamentals\n• Experience with TensorFlow or PyTorch\n• Good communication skills", description: "Train, evaluate and ship ML models that power our recruitment products." }, recId, "Priya Recruiter");
  const job = q.job(jobId);
  require("./data/dataset/candidates.json").filter((c) => /Machine Learning|AI Engineer|Data Analyst/.test(c.targetRole)).slice(0, 8).forEach((c) => {
    const profile = { skills: c.skills, projects: c.projects, experience: c.experience, education: { cgpa: c.cgpa, subject: c.subject, degree: c.degree } };
    q.createApplication({ userId: null, jobId, jobTitle: job.title, name: c.name, college: c.college, degree: c.degree, subject: c.subject, cgpa: c.cgpa, graduationYear: c.graduationYear, skills: c.skills, projects: c.projects, experience: c.experience, cv: null, resumeText: "", score: nlp.scoreMatch(job, profile).score, predictedRole: null });
  });
  console.log("[db] seeded demo accounts: recruiter@demo.com / payel@demo.com (password demo1234)");
}

// ---------- health ----------
app.get("/", (req, res) => res.json({ message: "HireHub API running", status: "ok" }));
app.get("/api/health", async (req, res) => res.json({ api: "ok", jobs: q.jobCount(), ml: (await ml.health()) || "offline" }));

// ---------- auth (bcrypt + JWT) ----------
app.post("/api/auth/send-otp", (req, res) => {
  const { contact } = req.body;
  if (!contact) return res.status(400).json({ message: "Email or phone is required." });
  const otp = String(crypto.randomInt(100000, 1000000));
  otps.set(contact, { otp, exp: Date.now() + 10 * 60000 });
  res.json({ message: `OTP sent to ${contact}.`, devOtp: process.env.DEV_OTP === "false" ? undefined : otp });
});

app.post("/api/auth/register", wrap(async (req, res) => {
  const { name, contact, password, role, otp } = req.body;
  const rec = otps.get(contact);
  if (!rec || rec.otp !== otp || rec.exp < Date.now()) return res.status(400).json({ message: "Invalid or expired OTP." });
  if (!name || !password || password.length < 6) return res.status(400).json({ message: "Name and a password of at least 6 characters are required." });
  if (q.userByContact(contact)) return res.status(409).json({ message: "An account with this email/phone already exists. Please sign in." });
  const id = q.createUser({ name, contact, hash: bcrypt.hashSync(password, 10), role: role === "recruiter" ? "recruiter" : "candidate" });
  otps.delete(contact);
  const user = safeUser(q.userById(id));
  res.json({ token: auth.sign(user), user });
}));

app.post("/api/auth/login", (req, res) => {
  const { contact, password } = req.body;
  const u = contact && q.userByContact(contact);
  if (!u || !bcrypt.compareSync(String(password || ""), u.password_hash)) return res.status(401).json({ message: "Invalid email/phone or password." });
  res.json({ token: auth.sign(u), user: safeUser(u) });
});
app.get("/api/auth/me", auth.requireAuth(), (req, res) => res.json({ user: q.userById(req.user.id) }));

// ---------- jobs ----------
app.get("/api/jobs", (req, res) => res.json({ jobs: q.jobs() }));
app.get("/api/jobs/:id", (req, res) => { const j = q.job(Number(req.params.id)); j ? res.json({ job: j }) : res.status(404).json({ message: "Job not found." }); });
app.get("/api/my/jobs", auth.requireAuth("recruiter", "admin"), (req, res) => res.json({ jobs: q.jobsByUser(req.user.id) }));
app.post("/api/jobs", auth.requireAuth("recruiter", "admin"), wrap(async (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.company || !b.location) return res.status(400).json({ message: "Title, company and location are required." });
  const id = q.createJob({ ...b, skills: toSkills(b.skills) }, req.user.id, req.user.name);
  const job = q.job(id);
  ml.upsertJobs([job]); // keep the vector store in sync (fire and forget)
  res.status(201).json({ message: "Job published.", job });
}));

// ---------- profile ----------
app.get("/api/profile", auth.requireAuth(), (req, res) => res.json({ profile: q.getProfile(req.user.id) }));
app.post("/api/profile", auth.requireAuth(), upload.single("cv"), wrap(async (req, res) => {
  const resumeText = await resumeTools.extractText(req.file);
  const b = req.body;
  const profile = {
    education: { college: b.college, degree: b.degree, subject: b.subject, cgpa: b.cgpa, graduationYear: b.graduationYear },
    skills: b.skills || "", experience: b.experience || "", projects: b.projects || "",
    cv: req.file?.filename || null, resumeText: resumeText.slice(0, 12000),
    detectedSkills: nlp.extractSkills(`${b.skills || ""} ${b.projects || ""} ${resumeText}`),
  };
  const cls = await ml.classify(`${profile.skills}\n${profile.projects}\n${resumeText}`, 3);
  if (cls) profile.predictedRoles = cls.predictions;
  q.saveProfile(req.user.id, profile);
  res.json({ message: "Profile saved.", profile });
}));

// ---------- applications ----------
app.post("/api/applications", auth.requireAuth("candidate"), upload.single("cv"), wrap(async (req, res) => {
  const b = req.body, job = q.job(Number(b.jobId));
  if (!job) return res.status(404).json({ message: "Job not found." });
  if (q.hasApplied(req.user.id, job.id)) return res.status(409).json({ message: "You have already applied to this job." });
  const resumeText = (await resumeTools.extractText(req.file)).slice(0, 12000);
  const profile = { skills: b.skills, projects: b.projects, experience: b.experience, resumeText, education: { cgpa: b.cgpa, subject: b.subject, degree: b.degree } };
  const m = await ml.match(nlp.profileText(profile));
  const sims = m?.matches || []; const max = Math.max(0, ...sims.map((x) => x.similarity)) || 1;
  const hit = sims.find((x) => x.id === job.id);
  const score = nlp.scoreMatch(job, profile, hit ? hit.similarity / max : null).score;
  const cls = await ml.classify(`${b.skills}\n${b.projects}\n${resumeText}`, 1);
  try {
    q.createApplication({ userId: req.user.id, jobId: job.id, jobTitle: job.title, name: b.name || req.user.name, college: b.college, degree: b.degree, subject: b.subject, cgpa: b.cgpa, graduationYear: b.graduationYear, skills: b.skills || "", projects: b.projects || "", experience: b.experience || "", cv: req.file?.filename || null, resumeText, score, predictedRole: cls?.top_role || null });
  } catch (e) {
    if (/UNIQUE/.test(e.message)) return res.status(409).json({ message: "You have already applied to this job." });
    throw e;
  }
  res.json({ message: `Application submitted. Your AI match for this role: ${score}%.`, score });
}));
app.get("/api/applications/mine", auth.requireAuth(), (req, res) => res.json({ applications: q.applicationsByUser(req.user.id).map((a) => ({ id: a.id, jobId: a.job_id, jobTitle: a.job_title, company: a.company, score: a.score, createdAt: a.created_at })) }));

// ---------- dashboards ----------
app.get("/api/stats", auth.requireAuth(), (req, res) => {
  if (req.user.role === "candidate") {
    const apps = q.applicationsByUser(req.user.id);
    const avg = apps.length ? Math.round(apps.reduce((s, a) => s + (a.score || 0), 0) / apps.length) : 0;
    return res.json({ role: "candidate", applications: apps.length, avgMatch: avg, bestMatch: apps.length ? Math.max(...apps.map((a) => a.score || 0)) : 0, profileComplete: Boolean(q.getProfile(req.user.id)), recent: apps.slice(0, 5).map((a) => ({ jobId: a.job_id, jobTitle: a.job_title, company: a.company, score: a.score })) });
  }
  res.json({ role: "recruiter", ...q.statsForRecruiter(req.user.id) });
});

app.use("/api/ai", aiRoutes({ uploadDir, q, auth }));

// ---------- errors ----------
app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof multer.MulterError) return res.status(400).json({ message: err.message });
  res.status(500).json({ message: "Something went wrong on the server." });
});

ready.then(() => {
  seed();
  seedDemo();
  const server = app.listen(PORT, () => {
    console.log(`HireHub API running on http://localhost:${PORT}`);
    ml.syncJobs(() => q.jobs()); // index jobs in the ChromaDB vector store (retries until ML service is up)
  });
  server.on("error", (e) => {
    if (e.code === "EADDRINUSE") console.error(`\n✗ Port ${PORT} is already in use.\n  • macOS: port 5000 is taken by "AirPlay Receiver" — this project uses 5001, so another app is on ${PORT}.\n  • Find it:  lsof -i :${PORT}   then stop it, or set a different PORT in backend/.env\n`);
    else console.error("✗ Server error:", e.message);
    process.exit(1);
  });
}).catch((e) => { console.error("✗ Could not start the database:", e); process.exit(1); });
