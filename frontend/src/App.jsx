import {Link,Route,Routes,useNavigate,useParams} from "react-router-dom";
import {useEffect,useMemo,useState} from "react";
import axios from "axios";
import {MatchPanel,ResumeAnalyzer,ChatWidget,GenerateJD,RankedApplicants,ModelCard,getProfile,toApiProfile,pretty,apiErr} from "./ai";

const API=import.meta.env.VITE_API_URL||"http://localhost:5001/api";


function Navbar(){
 const token=localStorage.getItem("hirehub_token"),user=JSON.parse(localStorage.getItem("hirehub_user")||"null"),nav=useNavigate(),rec=user?.role==="recruiter";
 const logout=()=>{["hirehub_token","hirehub_user","hirehub_profile"].forEach(k=>localStorage.removeItem(k));nav("/")};
 return <nav className="nav"><Link className="brand" to="/">Hire<span>Hub</span></Link>
  <div className="nav-links"><Link to="/">Home</Link><Link to="/jobs">Jobs</Link><Link to="/ai/resume">Resume AI</Link><Link to="/ai/model">Model</Link>{token&&!rec&&<Link to="/dashboard">Dashboard</Link>}{token&&rec&&<Link to="/recruiter">Recruiter</Link>}{token&&rec&&<Link to="/admin">Post Job</Link>}{token?<button className="nav-logout" onClick={logout}>Logout{user?` (${user.name.split(" ")[0]})`:""}</button>:<Link className="login" to="/login">Sign In</Link>}</div>
 </nav>
}

function Home(){
 const companies=["NovaTech","CodeCraft","PixelWorks","DataLoop"],[jobCount,setJobCount]=useState(null);
 useEffect(()=>{axios.get(`${API}/jobs`).then(r=>setJobCount(r.data.jobs.length)).catch(()=>{})},[]);
 return <>
  <section className="unique-hero">
   <div className="hero-left">
    <div className="availability"><span></span> {jobCount!=null?`${jobCount} live opportunities`:"AI-matched opportunities"} · ranked for you</div>
    <h1>Turn your <em>skills</em><br/>into your next move.</h1>
    <p>HireHub's AI reads your resume, predicts your best-fit roles and shows exactly which skills you have — and which you're missing — for every job.</p>
    <div className="hero-actions"><Link className="primary hero-primary" to="/jobs">Find My Next Role <span>↗</span></Link><Link className="hero-text-link" to="/register">Build my profile →</Link></div>
    <div className="hero-proof"><div><b>{jobCount??"—"}</b><span>live jobs searched by AI</span></div><i></i><div><b>11</b><span>roles our model predicts</span></div><i></i><div><b>6</b><span>AI features built in</span></div></div>
   </div>
   <div className="orbit-board">
    <div className="board-main"><div className="board-top"><span>SAMPLE MATCH</span><b>DEMO</b></div><div className="signal-ring"><div className="signal-core">92<small>%</small><label>FIT</label></div><div className="ring-dot dot-one"></div><div className="ring-dot dot-two"></div></div><div className="signal-caption"><b>Full Stack Developer</b><span>NovaTech · Bengaluru</span></div><div className="skill-pills"><span>React ✓</span><span>Node.js ✓</span><span>MongoDB ✓</span><span>Express +</span></div></div>
    <div className="float-card float-one"><span className="float-icon">↗</span><div><b>3/4</b><small>skills matched</small></div></div><div className="float-card float-two"><span className="float-icon">★</span><div><b>1</b><small>skill to learn</small></div></div>
   </div>
  </section>
  <section className="intent-bar"><div><span className="intent-icon">⌕</span><div><small>LOOKING FOR</small><b>Internships & full-time roles</b></div></div><div><span className="intent-icon">⌖</span><div><small>WHERE</small><b>Remote · India · Anywhere</b></div></div><Link className="primary intent-btn" to="/jobs">Explore opportunities</Link></section>
  <section className="unique-section"><div className="section-heading"><p className="eyebrow">ONE PROFILE. BETTER MATCHES.</p><h2>HireHub understands the person behind the resume.</h2><p>Upload your CV once. Trained models classify it, vector search finds your jobs, and every score comes with the reasons.</p></div><div className="journey"><div className="journey-card"><span>01</span><div className="journey-line"></div><h3>Upload your CV</h3><p>Our model reads it and predicts your best-fit roles.</p></div><div className="journey-card featured"><span>02</span><div className="journey-line"></div><h3>See why you match</h3><p>Every score shows the skills you have and the ones you need.</p><div className="mini-match"><b>87%</b><span>skill match</span></div></div><div className="journey-card"><span>03</span><div className="journey-line"></div><h3>Prepare and apply</h3><p>Get tailored interview questions, then apply with confidence.</p></div></div></section>
  <section className="companies-section"><div><p className="eyebrow">HIRING ECOSYSTEM</p><h2>Opportunities from teams<br/>building what's next.</h2></div><div className="company-stack">{companies.map((c,i)=><div key={c} className="company-tile"><span>{String(i+1).padStart(2,"0")}</span><b>{c}</b><small>{["Technology","Software","Product","Data"][i]}</small><strong>↗</strong></div>)}</div></section>
  <section className="unique-cta"><div className="cta-shape"></div><div><p className="eyebrow">YOUR NEXT MOVE</p><h2>Stop applying blindly.</h2><p>Analyse your resume. Understand your fit. Apply smarter.</p></div><Link className="primary cta-button" to="/register">Analyse my resume ↗</Link></section>
 </>;
}

function Jobs(){
 const[all,setAll]=useState([]),[search,setSearch]=useState(""),[type,setType]=useState("All"),[scores,setScores]=useState({}),[shown,setShown]=useState(12),[loading,setLoading]=useState(true),[err,setErr]=useState("");
 useEffect(()=>{axios.get(`${API}/jobs`).then(r=>setAll(r.data.jobs)).catch(()=>setErr("Could not load jobs. Is the backend running?")).finally(()=>setLoading(false))},[]);
 useEffect(()=>{const p=getProfile();if(!p)return;axios.post(`${API}/ai/match-all`,{profile:toApiProfile(p)}).then(r=>setScores(r.data.scores)).catch(()=>{})},[]);
 const filtered=useMemo(()=>all.map(j=>({...j,match:scores[j.id]?.score??null})).filter(j=>{const q=search.toLowerCase();return(!q||`${j.title} ${j.company} ${j.location} ${j.skills.join(" ")}`.toLowerCase().includes(q))&&(type==="All"||j.type===type)}).sort((a,b)=>(b.match??-1)-(a.match??-1)),[all,search,type,scores]);
 return <section className="section"><div className="section-heading"><p className="eyebrow">OPPORTUNITIES</p><h2>Explore Jobs</h2><p>{Object.keys(scores).length?"Ranked by your AI match score.":"Sign in and build your profile to rank jobs by your AI match."}</p></div><div className="filters"><input value={search} onChange={e=>{setSearch(e.target.value);setShown(12)}} placeholder="Search role, company or skill..."/><select value={type} onChange={e=>{setType(e.target.value);setShown(12)}}><option>All</option><option>Full Time</option><option>Internship</option></select></div>{loading&&<div className="empty">Loading jobs…</div>}{err&&<p className="form-message error">{err}</p>}<div className="job-grid">{filtered.slice(0,shown).map(j=><JobCard key={j.id} job={j}/>)}</div>{!loading&&!filtered.length&&!err&&<div className="empty">No jobs found.</div>}{filtered.length>shown&&<div className="load-more"><button className="ghost" onClick={()=>setShown(shown+12)}>Show more ({filtered.length-shown} left)</button></div>}</section>
}

function JobCard({job}){
 return <article className="job-card"><div className="job-head"><div className="company-logo">{job.company[0]}</div><div><h3>{job.title}</h3><p>{job.company} · {job.location}</p><div className="posted-info"><span>Posted by</span><strong>{job.postedBy}</strong><span>·</span><span>{job.postedDate}</span></div></div></div><div className="tags">{job.skills.map(s=><span key={s}>{s}</span>)}</div><div className="job-bottom"><div><small>AI match</small><strong>{job.match!=null?`${job.match}%`:"—"}</strong></div><div className="job-salary"><small>Salary</small><strong>{job.salary}</strong></div><Link className="primary small" to={`/jobs/${job.id}`}>View Job</Link></div></article>
}

function JobDetails(){
 const{id}=useParams(),nav=useNavigate(),token=localStorage.getItem("hirehub_token"),[job,setJob]=useState(null),[err,setErr]=useState(""),[score,setScore]=useState(null);
 useEffect(()=>{setJob(null);setScore(null);axios.get(`${API}/jobs/${id}`).then(r=>setJob(r.data.job)).catch(()=>setErr("This job could not be found."))},[id]);
 if(err)return <section className="section"><Link className="back" to="/jobs">← Back to jobs</Link><div className="empty">{err}</div></section>;
 if(!job)return <section className="section"><div className="empty">Loading…</div></section>;
 const apply=()=>token?nav(`/jobs/${job.id}/apply`):nav("/login");
 return <section className="section details"><Link className="back" to="/jobs">← Back to jobs</Link><div className="detail-card"><div className="detail-header"><div className="company-logo large">{job.company[0]}</div><div><p className="eyebrow">{job.company}</p><h2>{job.title}</h2><p>{job.location} · {job.type}</p><div className="detail-posted"><span>Posted by</span><strong>{job.postedBy}</strong><span>·</span><span>{job.postedDate}</span></div></div><div className="score"><b>{score!=null?`${score}%`:"—"}</b><span>AI Match</span></div></div><div className="job-detail-salary"><div><small>SALARY</small><strong>{job.salary}</strong></div><div><small>JOB TYPE</small><strong>{job.type}</strong></div><div><small>LOCATION</small><strong>{job.location}</strong></div></div><hr/><h3>About the role</h3><p>{job.description}</p>{job.requirements&&<><h3>Requirements</h3><p style={{whiteSpace:"pre-line"}}>{job.requirements}</p></>}<h3>Required skills</h3><div className="tags">{job.skills.map(s=><span key={s}>{s}</span>)}</div><MatchPanel job={job} onScore={setScore}/><button className="primary button" onClick={apply}>{token?"Continue to Application":"Log In to Apply"}</button></div></section>
}

function Login(){
 const[contact,setContact]=useState(""),[password,setPassword]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),nav=useNavigate();
 const login=async e=>{e.preventDefault();setBusy(true);setMessage("");try{const{data}=await axios.post(`${API}/auth/login`,{contact,password});localStorage.setItem("hirehub_token",data.token);localStorage.setItem("hirehub_user",JSON.stringify(data.user));if(data.user.role==="recruiter")return nav("/recruiter");const{data:pr}=await axios.get(`${API}/profile`,{headers:{Authorization:`Bearer ${data.token}`}});if(pr.profile){localStorage.setItem("hirehub_profile",JSON.stringify(pr.profile));nav("/jobs")}else nav("/onboarding")}catch(e){setMessage(apiErr(e,"Login failed."))}finally{setBusy(false)}};
 return <section className="auth"><div className="auth-card"><p className="eyebrow">WELCOME BACK</p><h2>Sign in to HireHub</h2><form onSubmit={login}><label>Email or phone<input value={contact} onChange={e=>setContact(e.target.value)} placeholder="you@example.com or +91..." required/></label><label>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password" required/></label><button className="primary button" disabled={busy}>{busy?"Signing in...":"Sign In"}</button>{message&&<p className="form-message error">{message}</p>}</form><p className="auth-switch">Don't have an account? <Link to="/register">Sign up</Link></p></div></section>
}

function Register(){
 const[step,setStep]=useState("details"),[method,setMethod]=useState("phone"),[form,setForm]=useState({name:"",contact:"",password:"",role:"candidate"}),[otp,setOtp]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),nav=useNavigate();
 const update=e=>setForm({...form,[e.target.name]:e.target.value});
 const sendOtp=async e=>{e.preventDefault();setBusy(true);try{const{data}=await axios.post(`${API}/auth/send-otp`,{method,contact:form.contact});setMessage(data.message+(data.devOtp?` Development OTP: ${data.devOtp}`:""));setStep("otp")}catch(e){setMessage(apiErr(e,"Could not send OTP."))}finally{setBusy(false)}};
 const verify=async e=>{e.preventDefault();setBusy(true);try{const{data}=await axios.post(`${API}/auth/register`,{...form,method,otp});localStorage.setItem("hirehub_token",data.token);localStorage.setItem("hirehub_user",JSON.stringify(data.user));nav(data.user.role==="recruiter"?"/recruiter":"/onboarding")}catch(e){setMessage(apiErr(e,"Registration failed."))}finally{setBusy(false)}};
 return <section className="auth"><div className="auth-card"><p className="eyebrow">JOIN HIREHUB</p><h2>Create your account</h2>{step==="details"?<form onSubmit={sendOtp}><div className="method-tabs"><button type="button" className={method==="email"?"active":""} onClick={()=>setMethod("email")}>Email OTP</button><button type="button" className={method==="phone"?"active":""} onClick={()=>setMethod("phone")}>Phone OTP</button></div><label>Full name<input name="name" value={form.name} onChange={update} required/></label><label>{method==="email"?"Email address":"Phone number"}<input name="contact" value={form.contact} onChange={update} required type={method==="phone"?"tel":"email"}/></label><label>Password<input name="password" value={form.password} onChange={update} type="password" minLength="6" required/></label><label>Role<select name="role" value={form.role} onChange={update}><option value="candidate">Candidate</option><option value="recruiter">Recruiter</option></select></label><button className="primary button" disabled={busy}>{busy?"Sending...":"Send OTP"}</button>{message&&<p className="form-message">{message}</p>}<p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p></form>:<form onSubmit={verify}><p>Enter the 6-digit code sent to <strong>{form.contact}</strong>.</p><label>OTP<input value={otp} onChange={e=>setOtp(e.target.value)} maxLength="6" required/></label><button className="primary button" disabled={busy}>Verify & Create Account</button>{message&&<p className="form-message">{message}</p>}<button type="button" className="text-button" onClick={()=>setStep("details")}>Change email/phone</button></form>}</div></section>
}

function Onboarding(){
 const nav=useNavigate(),token=localStorage.getItem("hirehub_token");
 const[form,setForm]=useState({college:"",degree:"",subject:"",cgpa:"",graduationYear:"",skills:"",experience:"",projects:""}),[cv,setCv]=useState(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const update=e=>setForm({...form,[e.target.name]:e.target.value});
 const submit=async e=>{e.preventDefault();if(!token)return nav("/login");if(!cv)return setMessage("Please upload your CV / Resume.");setBusy(true);try{const data=new FormData();Object.entries(form).forEach(([k,v])=>data.append(k,v));data.append("cv",cv);const res=await axios.post(`${API}/profile`,data,{headers:{Authorization:`Bearer ${token}`}});localStorage.setItem("hirehub_profile",JSON.stringify(res.data.profile));setMessage("Profile saved successfully.");setTimeout(()=>nav("/dashboard"),700)}catch(e){setMessage(apiErr(e,"Could not save your profile."))}finally{setBusy(false)}};
 return <section className="section"><div className="section-heading"><p className="eyebrow">STEP 2 · YOUR PROFILE</p><h2>Build your career signal</h2><p>Complete your education, skills and CV so HireHub can calculate your best job matches.</p></div><div className="onboarding-card"><form onSubmit={submit}><h3>Educational Background</h3><div className="form-grid">{["college","degree","subject","cgpa","graduationYear"].map(name=><label key={name}>{name==="college"?"College / University":name==="degree"?"Degree":name==="subject"?"Subject / Major":name==="cgpa"?"CGPA":"Graduation Year"}<input name={name} value={form[name]} onChange={update} required/></label>)}</div><h3>Professional Profile</h3><label>Skills<input name="skills" value={form.skills} onChange={update} placeholder="React, Node.js, MongoDB" required/></label><label>Experience / Internships<textarea name="experience" value={form.experience} onChange={update}/></label><label>Projects<textarea name="projects" value={form.projects} onChange={update}/></label><label className="file-label">CV / Resume<input type="file" accept=".pdf,.doc,.docx" onChange={e=>setCv(e.target.files[0])} required/><small>{cv?cv.name:"PDF, DOC or DOCX · Required"}</small></label>{message&&<p className="form-message">{message}</p>}<button className="primary button" disabled={busy}>{busy?"Saving...":"Save Profile & Calculate Match"}</button></form></div></section>
}

function Apply(){
 const{id}=useParams(),nav=useNavigate(),token=localStorage.getItem("hirehub_token"),user=JSON.parse(localStorage.getItem("hirehub_user")||"null");
 const saved=getProfile(),[job,setJob]=useState(null),[form,setForm]=useState({college:saved?.education?.college||"",degree:saved?.education?.degree||"",subject:saved?.education?.subject||"",cgpa:saved?.education?.cgpa||"",graduationYear:saved?.education?.graduationYear||""}),[cv,setCv]=useState(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{axios.get(`${API}/jobs/${id}`).then(r=>setJob(r.data.job)).catch(()=>setMessage("Job not found."))},[id]);
 const update=e=>setForm({...form,[e.target.name]:e.target.value});
 if(!token)return <section className="auth"><div className="auth-card"><h2>Sign in required</h2><Link className="primary button" to="/login">Log In</Link><p className="auth-switch">Don't have an account? <Link to="/register">Create Account</Link></p></div></section>;
 if(user?.role==="recruiter")return <section className="auth"><div className="auth-card"><h2>Candidates only</h2><p>Recruiter accounts can't apply to jobs.</p><Link className="primary button" to="/recruiter">Recruiter dashboard</Link></div></section>;
 if(!job)return <section className="section"><div className="empty">{message||"Loading…"}</div></section>;
 const submit=async e=>{e.preventDefault();if(Object.values(form).some(v=>!v))return setMessage("All educational background fields are required.");if(!cv)return setMessage("CV / Resume is mandatory.");setBusy(true);try{const data=new FormData();Object.entries(form).forEach(([k,v])=>data.append(k,v));data.append("jobId",job.id);data.append("name",user?.name||"Candidate");data.append("skills",[saved?.skills,(saved?.detectedSkills||[]).join(", ")].filter(Boolean).join(", "));data.append("projects",saved?.projects||"");data.append("experience",saved?.experience||"");data.append("cv",cv);const res=await axios.post(`${API}/applications`,data);setMessage(res.data.message||"Application submitted.");setTimeout(()=>nav("/dashboard"),1500)}catch(e){setMessage(apiErr(e,"Application failed."))}finally{setBusy(false)}};
 return <section className="section"><Link className="back" to={`/jobs/${job.id}`}>← Back to job</Link><div className="apply-card"><p className="eyebrow">APPLICATION</p><h2>{job.title}</h2><p>{job.company} · {job.location} · {job.type}</p><h3>Educational Background</h3><form onSubmit={submit}><div className="form-grid">{["college","degree","subject","cgpa","graduationYear"].map(name=><label key={name}>{name}<input name={name} value={form[name]} onChange={update} required/></label>)}</div><h3>CV / Resume *</h3><input type="file" accept=".pdf,.doc,.docx,.txt" onChange={e=>setCv(e.target.files[0])} required/>{message&&<p className="form-message">{message}</p>}<button className="primary button" disabled={busy}>{busy?"Submitting...":"Submit Application"}</button></form></div></section>
}

function Dashboard(){
 const[s,setS]=useState(null),[err,setErr]=useState(""),p=getProfile();
 useEffect(()=>{axios.get(`${API}/stats`).then(r=>setS(r.data)).catch(()=>setErr("Sign in to see your dashboard."))},[]);
 return <section className="section"><div className="section-heading"><p className="eyebrow">CANDIDATE</p><h2>Candidate Dashboard</h2></div>{err&&<div className="empty">{err} <Link to="/login">Sign in</Link></div>}
  <div className="dashboard-grid"><Stat title="Applications" value={s?.applications??"—"}/><Stat title="Avg AI match" value={s?`${s.avgMatch}%`:"—"}/><Stat title="Best match" value={s?`${s.bestMatch}%`:"—"}/><Stat title="Profile" value={s?(s.profileComplete?"Complete":"Incomplete"):"—"}/></div>
  {p?.predictedRoles&&<div className="ai-panel wide"><div className="ai-panel-head"><h3>✦ Roles our trained model predicts for you</h3></div><div className="ai-bars">{p.predictedRoles.map(r=><div key={r.role}><label>{r.role}<em>{Math.round(r.probability*100)}%</em></label><div className="bar"><i style={{width:`${Math.round(r.probability*100)}%`}}/></div></div>)}</div><Link className="ghost small" to="/jobs">See jobs ranked for me →</Link></div>}
  {s?.recent?.length>0&&<><h3 style={{marginTop:28}}>Recent applications</h3>{s.recent.map(a=><div className="listing-card" key={a.jobId}><h3>{a.jobTitle}</h3><p>{a.company}</p><strong>{a.score}% match</strong></div>)}</>}
  {s&&!s.profileComplete&&<p><Link className="primary small" to="/onboarding">Complete my profile</Link></p>}
 </section>
}

function Stat({title,value}){return <div className="stat-card"><span>{title}</span><b>{value}</b></div>}

function Recruiter(){
 const[s,setS]=useState(null);
 useEffect(()=>{axios.get(`${API}/stats`).then(r=>setS(r.data)).catch(()=>{})},[]);
 return <section className="section"><div className="section-heading"><p className="eyebrow">RECRUITER</p><h2>Recruiter Dashboard</h2><p>Manage hiring activity.</p></div><div className="dashboard-grid"><Stat title="My Active Jobs" value={s?.activeJobs??"—"}/><Stat title="Applicants" value={s?.applicants??"—"}/><Stat title="Strong matches (70%+)" value={s?.strong??"—"}/></div><div className="post-options"><Link className="post-option" to="/recruiter/post-job"><h3>Post a Job</h3><p>Hire experienced professionals.</p></Link><Link className="post-option" to="/recruiter/post-internship"><h3>Post an Internship</h3><p>Find students and emerging talent.</p></Link><Link className="post-option" to="/recruiter/listings"><h3>Manage My Listings</h3><p>Edit and manage opportunities.</p></Link><Link className="post-option" to="/recruiter/applicants"><h3>AI-ranked Applicants</h3><p>See candidates ranked by fit, with reasons.</p></Link></div></section>
}

function Admin(){
 const[mode,setMode]=useState(null);
 const[form,setForm]=useState({type:"Full Time",title:"",company:"",location:"",salary:"",experience:"",education:"B.Tech",subject:"",cgpa:"",skills:"",requirements:"",description:"",deadline:""});
 const[message,setMessage]=useState("");
 const update=e=>setForm({...form,[e.target.name]:e.target.value});
 const choose=type=>{setMode(type);setForm({...form,type});setMessage("")};
 const user=JSON.parse(localStorage.getItem("hirehub_user")||"null");
 const publish=async e=>{
  e.preventDefault();
  try{
   const{data}=await axios.post(`${API}/jobs`,form);
   setMessage(`${form.type==="Internship"?"Internship":"Job"} published — it is now searchable and indexed by the AI matcher.`);
   setForm({type:form.type,title:"",company:"",location:"",salary:"",experience:"",education:"B.Tech",subject:"",cgpa:"",skills:"",requirements:"",description:"",deadline:""});
  }catch(err){setMessage(apiErr(err,"Could not publish."))}
 };
 if(!user||user.role!=="recruiter")return <section className="auth"><div className="auth-card"><p className="eyebrow">RECRUITERS ONLY</p><h2>Recruiter account required</h2><p>Sign in with a recruiter account to post jobs and internships.</p><Link className="primary button" to="/login">Sign in</Link><p className="auth-switch">New here? <Link to="/register">Create a recruiter account</Link></p></div></section>;
 return <section className="section">
  <div className="section-heading"><p className="eyebrow">ADMIN CONSOLE</p><h2>Post an Opportunity</h2><p>Publish verified job and internship requirements for HireHub candidates.</p></div>
  {!mode ? <div className="post-options">
   <button className="post-option admin-choice" onClick={()=>choose("Full Time")}><span className="admin-choice-icon">💼</span><h3>Post a Job</h3><p>Permanent roles with salary, skills, education and hiring requirements.</p><strong>Continue →</strong></button>
   <button className="post-option admin-choice" onClick={()=>choose("Internship")}><span className="admin-choice-icon">🎓</span><h3>Post an Internship</h3><p>Student internships with stipend, skills, eligibility and deadlines.</p><strong>Continue →</strong></button>
  </div> : <div className="post-form-card">
   <button className="back admin-back" onClick={()=>setMode(null)}>← Choose another</button>
   <h3>{form.type==="Internship"?"Post an Internship":"Post a Job"}</h3>
   <form onSubmit={publish}>
    <div className="form-grid">
     <label>Title<input name="title" value={form.title} onChange={update} placeholder={form.type==="Internship"?"Software Engineering Intern":"Software Engineer"} required/></label>
     <label>Company<input name="company" value={form.company} onChange={update} placeholder="Company name" required/></label>
     <label>Location<input name="location" value={form.location} onChange={update} placeholder="Kolkata / Remote" required/></label>
     <label>{form.type==="Internship"?"Stipend":"Salary"}<input name="salary" value={form.salary} onChange={update} placeholder={form.type==="Internship"?"₹20,000/month":"₹8–12 LPA"} required/></label>
     <label>Experience<input name="experience" value={form.experience} onChange={update} placeholder="0–2 years"/></label>
     <label>Minimum Education<select name="education" value={form.education} onChange={update}><option>B.Tech</option><option>B.E.</option><option>M.Tech</option><option>MCA</option><option>Any Graduate</option></select></label>
     <label>Subject / Branch<input name="subject" value={form.subject} onChange={update} placeholder="CSE / IT / Any"/></label>
     <label>Minimum CGPA<input name="cgpa" type="number" min="0" max="10" step="0.1" value={form.cgpa} onChange={update} placeholder="7.0"/></label>
     <label>Application Deadline<input name="deadline" type="date" value={form.deadline} onChange={update}/></label>
    </div>
    <label>Required Skills<input name="skills" value={form.skills} onChange={update} placeholder="React, Node.js, MongoDB" required/></label>
    <GenerateJD form={form} onFill={x=>setForm(f=>({...f,...x}))}/>
    <label>Job Requirements<textarea name="requirements" value={form.requirements} onChange={update} placeholder="Eligibility and hiring requirements..." required/></label>
    <label>Description<textarea name="description" value={form.description} onChange={update} placeholder="Describe the opportunity..." required/></label>
    {message&&<p className="form-message">{message}</p>}
    <button className="primary button">Publish {form.type==="Internship"?"Internship":"Job"} →</button>
   </form>
  </div>}
 </section>
}
function PostJob(){return <Admin/>}
function PostInternship(){return <Admin/>}
function Listings(){const[items,setItems]=useState(null);useEffect(()=>{axios.get(`${API}/my/jobs`).then(r=>setItems(r.data.jobs)).catch(()=>setItems([]))},[]);return <section className="section"><Link className="back" to="/recruiter">← Back</Link><div className="section-heading"><p className="eyebrow">RECRUITER</p><h2>My Listings</h2></div>{items?.map(j=><div className="listing-card" key={j.id}><h3>{j.title}</h3><p>{j.company} · {j.location}</p><strong>{j.salary}</strong></div>)}{items&&!items.length&&<div className="empty">No listings yet.</div>}</section>}

function Applicants(){return <RankedApplicants/>}

function App(){
 return <>
  <Navbar/>
  <main>
   <Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/jobs" element={<Jobs/>}/>
    <Route path="/jobs/:id" element={<JobDetails/>}/>
    <Route path="/jobs/:id/apply" element={<Apply/>}/>
    <Route path="/login" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route path="/onboarding" element={<Onboarding/>}/>
    <Route path="/dashboard" element={<Dashboard/>}/><Route path="/admin" element={<Admin/>}/>
    <Route path="/recruiter" element={<Recruiter/>}/>
    <Route path="/recruiter/post-job" element={<PostJob/>}/>
    <Route path="/recruiter/post-internship" element={<PostInternship/>}/>
    <Route path="/recruiter/listings" element={<Listings/>}/>
    <Route path="/recruiter/applicants" element={<Applicants/>}/>
    <Route path="/ai/resume" element={<ResumeAnalyzer/>}/>
    <Route path="/ai/model" element={<ModelCard/>}/>
    
   </Routes>
  </main>
  <ChatWidget/>
  <footer>HireHub · AI-powered recruitment platform</footer>
 </>
}

export default App;
