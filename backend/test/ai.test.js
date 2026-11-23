// Run: npm test  (no server or API key needed)
const assert = require("assert");
const nlp = require("../ai/nlp");
const jobs = require("../data/jobs");

// skill extraction handles aliases and tricky tokens
const s = nlp.extractSkills("Built apps with ReactJS, Node.js, Mongo and C++. Used Java (not JavaScript here).");
["react", "node.js", "mongodb", "c++", "java"].forEach((k) => assert(s.includes(k), `missing ${k}`));
assert(!nlp.extractSkills("I like javascripture").includes("javascript"));

// match: strong candidate beats weak one on the same job
const job = jobs[0];
const strong = nlp.scoreMatch(job, { skills: "React, Node.js, MongoDB", projects: "MERN job portal", education: { cgpa: "8", subject: "CSE" } });
const weak = nlp.scoreMatch(job, { skills: "Photoshop", education: { cgpa: "5", subject: "Arts" } });
assert(strong.score > 80, `strong=${strong.score}`);
assert(weak.score < 35, `weak=${weak.score}`);
assert.deepStrictEqual(strong.missingSkills, []);
assert(weak.eligibilityNotes.length === 2);

// semantic retrieval ranks the relevant doc first
const sims = nlp.tfidfSimilarity("spring boot mysql internship", jobs.map(nlp.jobText));
assert.strictEqual(sims.indexOf(Math.max(...sims)), 1);
console.log("all AI unit tests passed", { strong: strong.score, weak: weak.score });
