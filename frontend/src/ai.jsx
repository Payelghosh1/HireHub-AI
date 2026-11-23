import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import axios from "axios";

export const API=import.meta.env.VITE_API_URL||"http://localhost:5001/api";
/** Human-readable API error: distinguishes "backend not reachable" from "server said no". */
export const apiErr=(e,fallback)=>e.response
 ?(e.response.data?.message||`The server at ${API} returned ${e.response.status}${e.response.status===403||e.response.status===404?" — another app may be using this port (on macOS, turn off AirPlay Receiver or change PORT in backend/.env).":"."}`)
 :`Cannot reach the HireHub API at ${API}. Start it with: cd backend && npm start (and ml-service for AI features).`;
const SPECIAL={"node.js":"Node.js","next.js":"Next.js","rest api":"REST API","mongodb":"MongoDB","mysql":"MySQL","postgresql":"PostgreSQL","javascript":"JavaScript","typescript":"TypeScript","html":"HTML","css":"CSS","sql":"SQL","aws":"AWS","gcp":"GCP","nlp":"NLP","llm":"LLM","rag":"RAG","jwt":"JWT","ci/cd":"CI/CD","oop":"OOP","c++":"C++","c#":"C#","graphql":"GraphQL","fastapi":"FastAPI","langchain":"LangChain","pytorch":"PyTorch","tensorflow":"TensorFlow","scikit-learn":"scikit-learn","spring boot":"Spring Boot","ml":"ML"};
export const pretty=s=>SPECIAL[s]||String(s).replace(/\b\w/g,c=>c.toUpperCase());

export const getProfile=()=>{try{return JSON.parse(localStorage.getItem("hirehub_profile")||"null")}catch{return null}};
axios.interceptors.request.use(c=>{const t=localStorage.getItem("hirehub_token");if(t&&!c.headers.Authorization)c.headers.Authorization=`Bearer ${t}`;return c});
export const toApiProfile=p=>p&&{skills:[p.skills,(p.detectedSkills||[]).join(", ")].filter(Boolean).join(", "),experience:p.experience,projects:p.projects,resumeText:p.resumeText,education:p.education};

const SourceBadge=({source})=>source?<span className={`ai-badge ${source}`}>{source==="llm"?"✦ Claude":"⚙ Local NLP"}</span>:null;

/* ---------- Job match panel (job details page) ---------- */
export function MatchPanel({job,onScore}){
 const profile=getProfile(),[res,setRes]=useState(null),[qs,setQs]=useState(null),[busy,setBusy]=useState(""),[err,setErr]=useState("");
 if(!profile)return <div className="ai-panel"><h3>✦ AI fit analysis</h3><p>Complete your profile and upload your CV to see an explainable match score for this role.</p><Link className="primary small" to="/onboarding">Build my profile</Link></div>;
 const run=async(kind)=>{setBusy(kind);setErr("");try{
  if(kind==="match"){const{data}=await axios.post(`${API}/ai/match`,{job,profile:toApiProfile(profile)});setRes(data);onScore?.(data.score)}
  else{const{data}=await axios.post(`${API}/ai/interview-questions`,{job,profile:toApiProfile(profile)});setQs(data)}
 }catch(e){setErr(apiErr(e,"AI service unavailable. Is the backend running?"))}finally{setBusy("")}};
 return <div className="ai-panel"><div className="ai-panel-head"><h3>✦ AI fit analysis</h3>{res&&<SourceBadge source={res.source}/>}</div>
  {!res&&<p>See exactly why you match this role, what is missing, and how to close the gap.</p>}
  <div className="ai-actions"><button className="primary small" disabled={!!busy} onClick={()=>run("match")}>{busy==="match"?"Analysing…":res?"Re-analyse":"Analyse my fit"}</button><button className="ghost small" disabled={!!busy} onClick={()=>run("qs")}>{busy==="qs"?"Preparing…":"Interview prep"}</button></div>
  {err&&<p className="form-message error">{err}</p>}
  {res&&<div className="ai-result"><div className="ai-score"><b>{res.score}%</b><span>match</span></div><div className="ai-bars">{[["Skills",res.breakdown.skills],[res.semanticSource==="embeddings"?"Profile relevance (embeddings)":"Profile relevance",res.breakdown.semantic],["Eligibility",res.breakdown.eligibility]].map(([l,v])=><div key={l}><label>{l}<em>{v}%</em></label><div className="bar"><i style={{width:`${v}%`}}/></div></div>)}</div>
   <div className="ai-skills"><div><small>YOU HAVE</small><div className="tags">{res.matchedSkills.map(s=><span key={s} className="ok">{pretty(s)} ✓</span>)}{!res.matchedSkills.length&&<em>none yet</em>}</div></div><div><small>MISSING</small><div className="tags">{res.missingSkills.map(s=><span key={s} className="miss">{pretty(s)}</span>)}{!res.missingSkills.length&&<em>nothing — great fit!</em>}</div></div></div>
   <p className="ai-explain">{res.explanation}</p></div>}
  {qs&&<div className="ai-qs"><div className="ai-panel-head"><h4>Likely interview questions</h4><SourceBadge source={qs.source}/></div><ol>{qs.questions.map((q,i)=><li key={i}><b>{q.q}</b><small><span className={`qtype ${q.type}`}>{q.type}</span> {q.tip}</small></li>)}</ol></div>}
 </div>
}

/* ---------- Resume analyzer page ---------- */
export function ResumeAnalyzer(){
 const[file,setFile]=useState(null),[res,setRes]=useState(null),[busy,setBusy]=useState(false),[err,setErr]=useState(""),[matches,setMatches]=useState([]),[saved,setSaved]=useState(false);
 const run=async e=>{e.preventDefault();if(!file)return;setBusy(true);setErr("");setRes(null);setMatches([]);setSaved(false);try{const d=new FormData();d.append("cv",file);const{data}=await axios.post(`${API}/ai/parse-resume`,d);setRes(data);
  const[{data:cat},{data:m}]=await Promise.all([axios.get(`${API}/jobs`),axios.post(`${API}/ai/match-all`,{profile:{skills:data.skills.join(", "),resumeText:data.resumeText,education:{cgpa:data.cgpa,degree:data.degree}}})]);
  setMatches(cat.jobs.map(j=>({job:j,...m.scores[j.id]})).sort((x,y)=>y.score-x.score).slice(0,6))
 }catch(e){setErr(apiErr(e,"Could not analyse the resume. Is the backend running?"))}finally{setBusy(false)}};
 return <section className="section"><div className="section-heading"><p className="eyebrow">AI RESUME ANALYZER</p><h2>Get instant, specific resume feedback</h2><p>Upload a PDF, DOCX or TXT. A trained classifier predicts your best-fit roles, and your skills are matched against every job.</p></div>
  <div className="onboarding-card"><form onSubmit={run}><label className="file-label">Resume<input type="file" accept=".pdf,.docx,.txt" onChange={e=>setFile(e.target.files[0])} required/><small>{file?file.name:"PDF, DOCX or TXT · up to 5 MB"}</small></label><button className="primary button" disabled={busy||!file}>{busy?"Analysing…":"Analyse resume"}</button>{err&&<p className="form-message error">{err}</p>}</form></div>
  {res&&<div className="ai-panel wide"><div className="ai-panel-head"><h3>{res.name||"Your resume"}</h3><SourceBadge source={res.source}/></div><p className="ai-explain">{res.summary}</p>
   {res.roleModel&&<div className="ai-model"><div className="ai-panel-head"><h4>✦ Predicted role (trained classifier)</h4><span className="ai-badge llm">TF-IDF + Logistic Regression</span></div><div className="ai-bars">{res.roleModel.predictions.map(p=><div key={p.role}><label>{p.role}<em>{Math.round(p.probability*100)}%</em></label><div className="bar"><i style={{width:`${Math.round(p.probability*100)}%`}}/></div></div>)}</div>{res.roleModel.evidence_terms?.length>0&&<p className="ai-meta">Evidence the model used: {res.roleModel.evidence_terms.map(t=><code key={t}>{t}</code>)}</p>}<p className="ai-meta"><Link to="/ai/model">View model metrics →</Link></p></div>}
   <div className="ai-grid"><div><small>DETECTED SKILLS ({res.skills.length})</small><div className="tags">{res.skills.map(s=><span key={s}>{pretty(s)}</span>)}</div></div><div><small>SUGGESTED ROLES</small><div className="tags">{res.suggestedRoles?.map(s=><span key={s} className="ok">{s}</span>)}</div></div></div>
   <div className="ai-grid"><div><small>STRENGTHS</small><ul>{res.strengths?.map((s,i)=><li key={i}>{s}</li>)}</ul></div><div><small>HOW TO IMPROVE</small><ul>{res.improvements?.map((s,i)=><li key={i}>{s}</li>)}{!res.improvements?.length&&<li>Looks solid!</li>}</ul></div></div>
   <div className="ai-matches"><div className="ai-panel-head"><h4>Top jobs for this resume</h4><button className="ghost small" disabled={saved||!localStorage.getItem("hirehub_token")} title={localStorage.getItem("hirehub_token")?"":"Sign in to save"} onClick={async()=>{const old=getProfile()||{};const profile={...old,detectedSkills:res.skills,resumeText:res.resumeText,predictedRoles:res.roleModel?.predictions||old.predictedRoles,education:{...(old.education||{}),cgpa:old.education?.cgpa||res.cgpa,degree:old.education?.degree||res.degree}};localStorage.setItem("hirehub_profile",JSON.stringify(profile));setSaved(true)}}>{saved?"✓ Saved to my profile":"Use for my matches"}</button></div>
   {matches.map(({job,score,matchedSkills,missingSkills})=><div className="match-row" key={job.id}><div className="ai-score"><b>{score}%</b></div><div className="match-main"><Link to={`/jobs/${job.id}`}><b>{job.title}</b></Link><small>{job.company} · {job.location}</small><div className="tags">{matchedSkills.map(s=><span key={s} className="ok">{pretty(s)} ✓</span>)}{missingSkills.map(s=><span key={s} className="miss">{pretty(s)}</span>)}</div></div></div>)}</div>
   <p className="ai-meta">{res.wordCount} words · {res.email||"no email found"} {res.degree?`· ${res.degree}`:""} {res.cgpa?`· CGPA ${res.cgpa}`:""}</p></div>}
 </section>
}

/* ---------- Floating career assistant ---------- */
export function ChatWidget(){
 const[open,setOpen]=useState(false),[input,setInput]=useState(""),[busy,setBusy]=useState(false),[msgs,setMsgs]=useState([{role:"assistant",content:"Hi! I'm HireHub's career assistant. Ask me for job matches, skills to learn, resume tips or interview prep."}]),end=useRef(null);
 useEffect(()=>{end.current?.scrollIntoView({behavior:"smooth"})},[msgs,open]);
 const send=async text=>{const m=(text??input).trim();if(!m||busy)return;setInput("");const next=[...msgs,{role:"user",content:m}];setMsgs(next);setBusy(true);
  try{const{data}=await axios.post(`${API}/ai/chat`,{message:m,history:next.slice(1,-1),profile:toApiProfile(getProfile())});
   setMsgs([...next,{role:"assistant",content:data.reply,source:data.source,retrieval:data.retrieval,sources:data.sources?.slice(0,3)}])
  }catch(e){setMsgs([...next,{role:"assistant",content:apiErr(e,"I can't reach the server right now. Please make sure the backend is running.")}])}finally{setBusy(false)}};
 return <>
  <button className="chat-fab" onClick={()=>setOpen(!open)} aria-label="Open career assistant">{open?"✕":"✦"}</button>
  {open&&<div className="chat-box"><div className="chat-head"><b>✦ Career Assistant</b><small>RAG over live jobs · ChromaDB vector search</small></div>
   <div className="chat-body">{msgs.map((m,i)=><div key={i} className={`chat-msg ${m.role}`}>{m.content}{m.sources?.length>0&&<div className="chat-src">{m.sources.map(s=><Link key={s.id} to={`/jobs/${s.id}`} onClick={()=>setOpen(false)}>{s.title} · {s.company}</Link>)}</div>}{m.source&&<><SourceBadge source={m.source}/>{m.retrieval==="chroma"&&<span className="ai-badge llm">⌕ vector search</span>}</>}</div>)}{busy&&<div className="chat-msg assistant typing">Thinking…</div>}<div ref={end}/></div>
   {msgs.length<2&&<div className="chat-chips">{["Which jobs fit me?","What skills should I learn?","How do I prepare for interviews?"].map(c=><button key={c} onClick={()=>send(c)}>{c}</button>)}</div>}
   <form className="chat-input" onSubmit={e=>{e.preventDefault();send()}}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask anything about jobs or careers…"/><button disabled={busy}>Send</button></form></div>}
 </>
}

/* ---------- Admin: AI job description generator ---------- */
export function GenerateJD({form,onFill}){
 const[busy,setBusy]=useState(false),[note,setNote]=useState("");
 const run=async()=>{if(!form.title)return setNote("Enter a job title first.");setBusy(true);setNote("");try{const{data}=await axios.post(`${API}/ai/job-description`,{title:form.title,company:form.company,type:form.type,skills:form.skills,experience:form.experience});
  const extra=(data.suggestedSkills||[]).filter(s=>!form.skills.toLowerCase().includes(s.toLowerCase()));
  onFill({description:data.description,requirements:data.requirements});setNote(`Draft generated (${data.source==="llm"?"Claude":"local NLP"}).${extra.length?` Consider adding: ${extra.map(pretty).join(", ")}.`:""} Review before publishing.`)
 }catch(e){setNote(apiErr(e,"AI service unavailable."))}finally{setBusy(false)}};
 return <div className="ai-inline"><button type="button" className="ghost small" onClick={run} disabled={busy}>{busy?"Generating…":"✦ Generate description & requirements with AI"}</button>{note&&<small>{note}</small>}</div>
}

/* ---------- Recruiter: AI-ranked applicants ---------- */
export function RankedApplicants(){
 const[jobs,setJobs]=useState(null),[jobId,setJobId]=useState(""),[list,setList]=useState(null),[err,setErr]=useState("");
 useEffect(()=>{axios.get(`${API}/my/jobs`).then(r=>{setJobs(r.data.jobs);if(r.data.jobs[0])setJobId(r.data.jobs[0].id)}).catch(()=>{setJobs([]);setErr("Sign in with a recruiter account to see applicants.")})},[]);
 useEffect(()=>{if(!jobId)return;setList(null);setErr("");axios.get(`${API}/ai/rank-applicants`,{params:{jobId}}).then(r=>setList(r.data.applicants)).catch(e=>setErr(apiErr(e,"Could not load applicants.")))},[jobId]);
 return <section className="section"><Link className="back" to="/recruiter">← Back</Link><div className="section-heading"><p className="eyebrow">RECRUITER · AI SCREENING</p><h2>Applicants, ranked by fit</h2><p>Each CV is parsed, classified and scored against the role — with the reasons shown.</p></div>
  {jobs?.length>0&&<div className="filters"><select value={jobId} onChange={e=>setJobId(e.target.value)}>{jobs.map(j=><option key={j.id} value={j.id}>{j.title} · {j.company}</option>)}</select></div>}
  {jobs&&!jobs.length&&!err&&<div className="empty">You haven't posted any jobs yet. <Link to="/admin">Post one</Link>.</div>}
  {err&&<p className="form-message error">{err}</p>}
  {list?.map((a,i)=><div className="listing-card applicant" key={a.id}><div className="rank">#{i+1}</div><div className="applicant-main"><h3>{a.name}</h3><p>{a.college||"—"} · CGPA {a.cgpa||"—"}{a.predictedRole&&<> · model predicts: <b>{a.predictedRole}</b></>}</p><div className="tags">{a.matchedSkills.map(s=><span key={s} className="ok">{pretty(s)} ✓</span>)}{a.missingSkills.map(s=><span key={s} className="miss">{pretty(s)}</span>)}</div></div><div className="ai-score"><b>{a.score}%</b><span>fit</span></div></div>)}
  {list&&!list.length&&<div className="empty">No applications for this job yet.</div>}
 </section>
}

/* ---------- Model card: metrics of the trained models ---------- */
export function ModelCard(){
 const[m,setM]=useState(null),[err,setErr]=useState("");
 useEffect(()=>{axios.get(`${API}/ai/ml/metrics`).then(r=>setM(r.data)).catch(e=>setErr(apiErr(e,"Could not load metrics.")))},[]);
 const pct=v=>`${(v*100).toFixed(1)}%`;
 return <section className="section"><div className="section-heading"><p className="eyebrow">MODEL CARD</p><h2>How HireHub's models perform</h2><p>Transparent metrics for the resume classifier and the embedding retriever.</p></div>
  {err&&<p className="form-message error">{err}</p>}
  {m&&<>
   <div className="ai-panel wide warn"><b>⚠ Data source:</b> {m.data_source}. {m.note}</div>
   <div className="dashboard-grid"><Stat2 t="Test accuracy" v={pct(m.accuracy)}/><Stat2 t="Macro F1" v={pct(m.macro_f1)}/><Stat2 t="Train / test" v={`${m.n_train} / ${m.n_test}`}/><Stat2 t="Classes" v={m.classes.length}/></div>
   <div className="ai-panel wide"><h3>Classifier comparison</h3><table className="mtable"><thead><tr><th>Model</th><th>5-fold CV macro-F1</th><th>Test accuracy</th><th>Test macro-F1</th></tr></thead><tbody>{Object.entries(m.model_comparison).map(([k,v])=><tr key={k} className={k===m.chosen_model?"chosen":""}><td>{k}{k===m.chosen_model&&" ✓ deployed"}</td><td>{pct(v.cv_macro_f1)} ± {(v.cv_std*100).toFixed(1)}</td><td>{pct(v.test_accuracy)}</td><td>{pct(v.test_macro_f1)}</td></tr>)}</tbody></table></div>
   <div className="ai-panel wide"><h3>Job retrieval: embeddings vs TF-IDF baseline</h3><p>How often a job of the resume's true role appears in the top-k results.</p><table className="mtable"><thead><tr><th>Method</th><th>Top-1</th><th>Top-3</th><th>Top-5</th></tr></thead><tbody>{Object.entries(m.retrieval).map(([k,v])=><tr key={k}><td>{k==="embeddings_LSA"?"Trained embeddings (LSA, 96-d) + ChromaDB":"Plain TF-IDF cosine (baseline)"}</td><td>{pct(v.top1)}</td><td>{pct(v.top3)}</td><td>{pct(v.top5)}</td></tr>)}</tbody></table></div>
   <div className="ai-panel wide"><h3>Per-role results</h3><table className="mtable"><thead><tr><th>Role</th><th>Precision</th><th>Recall</th><th>F1</th><th>Support</th></tr></thead><tbody>{Object.entries(m.per_class).map(([k,v])=><tr key={k}><td>{k}</td><td>{pct(v.precision)}</td><td>{pct(v.recall)}</td><td>{pct(v["f1-score"])}</td><td>{v.support}</td></tr>)}</tbody></table></div>
  </>}
 </section>
}
const Stat2=({t,v})=><div className="stat-card"><span>{t}</span><b>{v}</b></div>;
