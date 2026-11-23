// Local NLP engine: skill extraction, TF-IDF cosine similarity and explainable match scoring.
// Works with zero external services, so the AI features always function (LLM output is layered on top).

const SKILLS = {
  // languages
  javascript: ["javascript", "js", "es6"], typescript: ["typescript", "ts"], python: ["python"],
  java: ["java"], "c++": ["c++", "cpp"], c: ["c language"], "c#": ["c#", "csharp"], go: ["golang", "go lang"],
  php: ["php"], kotlin: ["kotlin"], swift: ["swift"], sql: ["sql"], bash: ["bash", "shell scripting"],
  // frontend
  react: ["react", "reactjs", "react.js"], "next.js": ["next.js", "nextjs", "next js"], angular: ["angular"],
  vue: ["vue", "vue.js", "vuejs"], html: ["html", "html5"], css: ["css", "css3"], tailwind: ["tailwind", "tailwindcss"],
  bootstrap: ["bootstrap"], redux: ["redux"], vite: ["vite"],
  // backend
  "node.js": ["node.js", "nodejs", "node js", "node"], express: ["express", "expressjs", "express.js"],
  "spring boot": ["spring boot", "springboot", "spring"], django: ["django"], flask: ["flask"], fastapi: ["fastapi"],
  "rest api": ["rest", "rest api", "restful", "restful api", "rest apis"], graphql: ["graphql"],
  // data
  mongodb: ["mongodb", "mongo"], mysql: ["mysql"], postgresql: ["postgresql", "postgres"], redis: ["redis"],
  firebase: ["firebase"], "data structures": ["data structures", "dsa", "algorithms"],
  // devops / tools
  git: ["git", "github", "gitlab"], docker: ["docker"], kubernetes: ["kubernetes", "k8s"], aws: ["aws", "amazon web services"],
  azure: ["azure"], gcp: ["gcp", "google cloud"], linux: ["linux"], "ci/cd": ["ci/cd", "cicd", "jenkins", "github actions"],
  jest: ["jest"], postman: ["postman"], figma: ["figma"],
  // ai / ml
  "machine learning": ["machine learning", "ml"], "deep learning": ["deep learning"], nlp: ["nlp", "natural language processing"],
  tensorflow: ["tensorflow"], pytorch: ["pytorch"], "scikit-learn": ["scikit-learn", "sklearn"], pandas: ["pandas"],
  numpy: ["numpy"], "computer vision": ["computer vision", "opencv"], llm: ["llm", "llms", "large language model", "large language models"],
  "prompt engineering": ["prompt engineering"], rag: ["rag", "retrieval augmented generation", "retrieval-augmented generation"],
  langchain: ["langchain"], "generative ai": ["generative ai", "genai", "gen ai"],
  // soft / misc
  agile: ["agile", "scrum"], "problem solving": ["problem solving", "problem-solving"], communication: ["communication"],
  oop: ["oop", "object oriented", "object-oriented"], "system design": ["system design"], microservices: ["microservices"],
  jwt: ["jwt", "json web token"], "web sockets": ["websocket", "websockets", "socket.io"],
};

const ALIAS_TO_SKILL = new Map();
for (const [skill, aliases] of Object.entries(SKILLS)) {
  ALIAS_TO_SKILL.set(skill, skill);
  aliases.forEach((a) => ALIAS_TO_SKILL.set(a, skill));
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ALIAS_REGEXES = [...ALIAS_TO_SKILL.entries()].map(([alias, skill]) => ({
  skill,
  re: new RegExp(`(^|[^a-z0-9+#.])${escapeRe(alias)}(?![a-z0-9+#])`, "i"),
}));

/** Canonical skill names found in free text. */
function extractSkills(text = "") {
  const found = new Set();
  for (const { skill, re } of ALIAS_REGEXES) if (re.test(text)) found.add(skill);
  return [...found];
}

/** Turn "React, Node.js ; MongoDB" or ["React"] into canonical skills (keeps unknown ones too). */
function normalizeSkillList(input) {
  const raw = Array.isArray(input) ? input : String(input || "").split(/[,;\n|]/);
  const out = new Set();
  for (const item of raw) {
    const t = String(item).trim().toLowerCase();
    if (!t) continue;
    out.add(ALIAS_TO_SKILL.get(t) || t);
  }
  return [...out];
}

const STOP = new Set(("a an the and or of to in on for with at by from is are was were be as it this that these those you your we our " +
  "will can should must have has had not but if then than so such into over under about across per via etc").split(" "));

function tokenize(text = "") {
  return (String(text).toLowerCase().match(/[a-z0-9+#.]{2,}/g) || [])
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** TF-IDF cosine similarity between a query text and a list of docs. Returns scores aligned with docs. */
function tfidfSimilarity(query, docs) {
  const all = [query, ...docs].map(tokenize);
  const N = all.length;
  const df = new Map();
  all.forEach((toks) => new Set(toks).forEach((t) => df.set(t, (df.get(t) || 0) + 1)));
  const vec = (toks) => {
    const tf = new Map();
    toks.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
    const v = new Map();
    for (const [t, c] of tf) v.set(t, (1 + Math.log(c)) * (Math.log((N + 1) / (df.get(t) + 1)) + 1));
    return v;
  };
  const norm = (v) => Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0)) || 1;
  const q = vec(all[0]);
  const qn = norm(q);
  return all.slice(1).map((toks) => {
    const d = vec(toks);
    let dot = 0;
    for (const [t, w] of q) if (d.has(t)) dot += w * d.get(t);
    return dot / (qn * norm(d));
  });
}

const jobText = (j) =>
  [j.title, j.company, j.location, j.type, (j.skills || []).join(" "), j.requirements, j.description].filter(Boolean).join(" ");

const profileText = (p = {}) =>
  [p.skills, p.experience, p.projects, p.resumeText, p.education?.subject, p.education?.degree].filter(Boolean).join(" ");

/**
 * Explainable job↔candidate match.
 * score = 60% required-skill coverage + 25% semantic (TF-IDF) similarity + 15% eligibility (CGPA / branch).
 */
function scoreMatch(job, profile, semanticOverride = null) {
  const required = normalizeSkillList(job.skills);
  const candidateSkills = new Set([
    ...normalizeSkillList(profile.skills),
    ...extractSkills(profileText(profile)),
  ]);
  const matched = required.filter((s) => candidateSkills.has(s));
  const missing = required.filter((s) => !candidateSkills.has(s));
  const skillCoverage = required.length ? matched.length / required.length : 0.5;

  let semantic;
  if (typeof semanticOverride === "number") semantic = Math.max(0, Math.min(1, semanticOverride)); // from the embedding model
  else semantic = Math.min(1, (tfidfSimilarity(profileText(profile) || "", [jobText(job)])[0] || 0) * 2.2);

  let eligibility = 1;
  const notes = [];
  const cgpa = parseFloat(profile.education?.cgpa);
  const minCgpa = parseFloat(job.cgpa);
  if (!isNaN(minCgpa) && !isNaN(cgpa) && cgpa < minCgpa) { eligibility -= 0.6; notes.push(`CGPA ${cgpa} is below the required ${minCgpa}`); }
  const branch = String(job.subject || "").toLowerCase();
  const subject = String(profile.education?.subject || "").toLowerCase();
  if (branch && !/any/.test(branch) && subject && !branch.split(/[\/,]/).some((b) => subject.includes(b.trim()) || b.trim().includes(subject))) {
    eligibility -= 0.4; notes.push(`Preferred branch is ${job.subject}`);
  }
  eligibility = Math.max(0, eligibility);

  const score = Math.round(100 * (0.6 * skillCoverage + 0.25 * semantic + 0.15 * eligibility));
  return {
    score,
    matchedSkills: matched,
    missingSkills: missing,
    extraSkills: [...candidateSkills].filter((s) => !required.includes(s)).slice(0, 12),
    breakdown: {
      skills: Math.round(skillCoverage * 100),
      semantic: Math.round(semantic * 100),
      eligibility: Math.round(eligibility * 100),
    },
    eligibilityNotes: notes,
    semanticSource: typeof semanticOverride === "number" ? "embeddings" : "tfidf",
  };
}

module.exports = { SKILLS, extractSkills, normalizeSkillList, tokenize, tfidfSimilarity, scoreMatch, jobText, profileText };
