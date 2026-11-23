// Persistence layer: SQLite compiled to WebAssembly (sql.js) — pure JavaScript, works on Node 18, 20, 22+ with no
// native build step. The database lives in memory and is saved to data/hirehub.db after every write.
// All SQL lives in this file, so swapping to Postgres/MongoDB later only touches db.js.
const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");

const file = process.env.DB_FILE || path.join(__dirname, "data", "hirehub.db");
fs.mkdirSync(path.dirname(file), { recursive: true });

let raw = null, timer = null;
const flush = () => { clearTimeout(timer); timer = null; if (raw) fs.writeFileSync(file, Buffer.from(raw.export())); };
const persist = () => { if (!timer) timer = setTimeout(flush, 100); };
process.on("exit", () => { try { if (timer) flush(); } catch {} });
["SIGINT", "SIGTERM"].forEach((sig) => process.on(sig, () => { try { flush(); } catch {} process.exit(0); }));
const norm = (v) => (v === undefined ? null : v);

// better-sqlite3-style helper: prepare(sql).get / all / run
const db = {
  prepare(sql) {
    return {
      get: (...p) => { const s = raw.prepare(sql); try { s.bind(p.map(norm)); return s.step() ? s.getAsObject() : undefined; } finally { s.free(); } },
      all: (...p) => { const s = raw.prepare(sql); try { s.bind(p.map(norm)); const rows = []; while (s.step()) rows.push(s.getAsObject()); return rows; } finally { s.free(); } },
      run: (...p) => { raw.run(sql, p.map(norm)); const id = raw.exec("SELECT last_insert_rowid()")[0].values[0][0]; persist(); return { lastInsertRowid: id }; },
    };
  },
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,contact TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'candidate',created_at INTEGER);
CREATE TABLE IF NOT EXISTS profiles(user_id INTEGER PRIMARY KEY,data TEXT NOT NULL,updated_at INTEGER);
CREATE TABLE IF NOT EXISTS jobs(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT,company TEXT,location TEXT,type TEXT,salary TEXT,experience TEXT,education TEXT,subject TEXT,cgpa TEXT,skills TEXT,requirements TEXT,description TEXT,deadline TEXT,posted_by INTEGER,posted_by_name TEXT,created_at INTEGER);
CREATE TABLE IF NOT EXISTS applications(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,job_id INTEGER,job_title TEXT,name TEXT,college TEXT,degree TEXT,subject TEXT,cgpa TEXT,graduation_year TEXT,skills TEXT,projects TEXT,experience TEXT,cv TEXT,resume_text TEXT,score INTEGER,predicted_role TEXT,created_at INTEGER,UNIQUE(user_id,job_id));
`;

/** Must be awaited once at startup (loads the WASM engine and the saved database file). */
const ready = initSqlJs().then((SQL) => {
  raw = fs.existsSync(file) ? new SQL.Database(fs.readFileSync(file)) : new SQL.Database();
  raw.run(SCHEMA);
  persist();
});

const now = () => Date.now();
const rel = (ms) => { const d = Math.floor((Date.now() - ms) / 86400000); return d < 1 ? "Today" : d === 1 ? "1 day ago" : `${d} days ago`; };
const toJob = (r) => r && { id: r.id, title: r.title, company: r.company, location: r.location, type: r.type, salary: r.salary, experience: r.experience, education: r.education, subject: r.subject, cgpa: r.cgpa, skills: JSON.parse(r.skills || "[]"), requirements: r.requirements, description: r.description, deadline: r.deadline, postedBy: r.posted_by_name, postedById: r.posted_by, postedDate: rel(r.created_at) };

const q = {
  userByContact: (c) => db.prepare("SELECT * FROM users WHERE contact=?").get(c),
  userById: (id) => db.prepare("SELECT id,name,contact,role FROM users WHERE id=?").get(id),
  createUser: (u) => Number(db.prepare("INSERT INTO users(name,contact,password_hash,role,created_at) VALUES(?,?,?,?,?)").run(u.name, u.contact, u.hash, u.role, now()).lastInsertRowid),

  saveProfile: (uid, data) => db.prepare("INSERT INTO profiles(user_id,data,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at").run(uid, JSON.stringify(data), now()),
  getProfile: (uid) => { const r = db.prepare("SELECT data FROM profiles WHERE user_id=?").get(uid); return r ? JSON.parse(r.data) : null; },

  jobs: () => db.prepare("SELECT * FROM jobs ORDER BY created_at DESC, id DESC").all().map(toJob),
  job: (id) => toJob(db.prepare("SELECT * FROM jobs WHERE id=?").get(id)),
  jobsByUser: (uid) => db.prepare("SELECT * FROM jobs WHERE posted_by=? ORDER BY created_at DESC").all(uid).map(toJob),
  jobCount: () => db.prepare("SELECT COUNT(*) n FROM jobs").get().n,
  createJob: (j, uid, uname, createdAt = now()) => Number(db.prepare("INSERT INTO jobs(title,company,location,type,salary,experience,education,subject,cgpa,skills,requirements,description,deadline,posted_by,posted_by_name,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(j.title, j.company, j.location, j.type || "Full Time", j.salary || "", j.experience || "", j.education || "", j.subject || "", String(j.cgpa ?? ""), JSON.stringify(j.skills || []), j.requirements || "", j.description || "", j.deadline || "", uid ?? null, uname || "HireHub", createdAt).lastInsertRowid),

  createApplication: (a) => db.prepare("INSERT INTO applications(user_id,job_id,job_title,name,college,degree,subject,cgpa,graduation_year,skills,projects,experience,cv,resume_text,score,predicted_role,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(...[a.userId, a.jobId, a.jobTitle, a.name, a.college, a.degree, a.subject, a.cgpa, a.graduationYear, a.skills, a.projects, a.experience, a.cv, a.resumeText, a.score, a.predictedRole].map((v) => v ?? null), now()),
  hasApplied: (uid, jobId) => Boolean(db.prepare("SELECT 1 FROM applications WHERE user_id=? AND job_id=?").get(uid, jobId)),
  applicationsForJob: (jobId) => db.prepare("SELECT * FROM applications WHERE job_id=? ORDER BY score DESC").all(jobId),
  applicationsByUser: (uid) => db.prepare("SELECT a.*,j.company FROM applications a LEFT JOIN jobs j ON j.id=a.job_id WHERE a.user_id=? ORDER BY a.created_at DESC").all(uid),
  statsForRecruiter: (uid) => ({
    activeJobs: db.prepare("SELECT COUNT(*) n FROM jobs WHERE posted_by=?").get(uid).n,
    applicants: db.prepare("SELECT COUNT(*) n FROM applications a JOIN jobs j ON j.id=a.job_id WHERE j.posted_by=?").get(uid).n,
    strong: db.prepare("SELECT COUNT(*) n FROM applications a JOIN jobs j ON j.id=a.job_id WHERE j.posted_by=? AND a.score>=70").get(uid).n,
  }),
};
module.exports = { db, q, ready };
