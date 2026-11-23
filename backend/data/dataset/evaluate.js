// Evaluates the match engine on the dataset: does the candidate's target role rank in the top 3 jobs?
const nlp=require("../../ai/nlp");const jobs=require("./jobs.json"),cands=require("./candidates.json");
let top1=0,top3=0;
for(const c of cands){
 const profile={skills:c.skills,projects:c.projects,experience:c.experience,education:{cgpa:c.cgpa,subject:c.subject,degree:c.degree}};
 const ranked=jobs.map(j=>({j,s:nlp.scoreMatch(j,profile).score})).sort((a,b)=>b.s-a.s);
 const roleOf=j=>j.title.replace("Intern – ","");
 if(roleOf(ranked[0].j)===c.targetRole)top1++;
 if(ranked.slice(0,3).some(r=>roleOf(r.j)===c.targetRole))top3++;
}
console.log(`candidates: ${cands.length} | target role in top-1: ${(100*top1/cands.length).toFixed(0)}% | top-3: ${(100*top3/cands.length).toFixed(0)}%`);
