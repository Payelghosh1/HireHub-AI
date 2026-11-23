"""Synthetic HireHub dataset generator (deterministic). Run: python3 generate.py"""
import json, csv, random
random.seed(42)

ROLES = {
 "Full Stack Developer": (["React","Node.js","MongoDB","Express","JavaScript"], ["Git","REST API","TypeScript","Docker"], (7,14)),
 "Frontend Developer": (["React","JavaScript","HTML","CSS"], ["TypeScript","Redux","Tailwind","Figma"], (5,11)),
 "Backend Developer": (["Node.js","Express","MongoDB","REST API"], ["PostgreSQL","Redis","Docker","JWT"], (6,13)),
 "Java Developer": (["Java","Spring Boot","MySQL","REST API"], ["Microservices","Docker","Git"], (6,12)),
 "Python Developer": (["Python","Django","PostgreSQL","REST API"], ["Flask","Docker","Git","AWS"], (6,12)),
 "Data Analyst": (["Python","SQL","Pandas","NumPy"], ["Machine Learning","Tableau","Excel"], (5,10)),
 "Machine Learning Engineer": (["Python","Machine Learning","TensorFlow","Pandas"], ["PyTorch","Scikit-learn","Docker","AWS"], (9,20)),
 "AI Engineer": (["Python","LLM","RAG","Prompt Engineering"], ["LangChain","FastAPI","Docker","NLP"], (10,22)),
 "DevOps Engineer": (["Docker","Kubernetes","AWS","Linux"], ["CI/CD","Bash","Git","Azure"], (8,16)),
 "Android Developer": (["Kotlin","Java","Git","REST API"], ["Firebase","Jetpack","Microservices"], (6,12)),
 "QA / Test Engineer": (["JavaScript","Jest","Postman","Git"], ["Python","CI/CD","SQL"], (4,9)),
}
COMPANIES = ["NovaTech","CodeCraft","PixelWorks","DataLoop","CloudNine","ByteForge","Infynet","QuantumLeap","Zenith Labs","Orbit Systems","BrightStack","TechNest","Mindgrid","SkyBridge","LogicHive"]
CITIES = ["Bengaluru","Hyderabad","Pune","Kolkata","Chennai","Mumbai","Delhi NCR","Remote"]
BRANCH = ["CSE / IT","CSE / IT / ECE","Any"]

jobs=[]; jid=1
for role,(core,extra,(lo,hi)) in ROLES.items():
    for k in range(6):
        intern = k % 3 == 2
        skills = core[:random.randint(3,len(core))] + random.sample(extra, random.randint(0,2))
        skills = list(dict.fromkeys(skills))
        co = random.choice(COMPANIES); city=random.choice(CITIES)
        sal = f"₹{random.randint(15,40)}k / month" if intern else f"₹{lo+random.randint(0,3)}–{hi-random.randint(0,3)} LPA"
        jobs.append({"id":jid,"title":("Intern – " if intern else "")+role if intern else role,"company":co,"location":city,
          "type":"Internship" if intern else "Full Time","salary":sal,"postedBy":f"{co} Careers","postedDate":f"{random.randint(1,14)} days ago",
          "skills":skills,"cgpa":random.choice(["6","6.5","7","7.5"]),"subject":random.choice(BRANCH),
          "experience":"0–1 years" if intern or k%2 else "0–2 years",
          "description":f"{co} is hiring a {role}{' intern' if intern else ''} to build and ship features using {', '.join(skills[:3])}. You will work with a small team, review code and own work from design to deployment."})
        jid+=1

FIRST=["Aarav","Ananya","Rahul","Priya","Arjun","Sneha","Rohan","Kavya","Vikram","Neha","Aditya","Isha","Karan","Meera","Siddharth","Pooja","Amit","Riya","Nikhil","Divya"]
LAST=["Sharma","Das","Patel","Reddy","Banerjee","Iyer","Singh","Gupta","Nair","Mukherjee","Verma","Joshi"]
COLLEGES=["Jadavpur University","NIT Durgapur","VIT Vellore","IIIT Hyderabad","BITS Pilani","Anna University","SRM University","Heritage Institute of Technology","KIIT","Manipal Institute of Technology"]
DEG={"CSE":"B.Tech","IT":"B.Tech","ECE":"B.Tech","MCA":"MCA"}
cands=[]
role_list=list(ROLES)
for i in range(1,61):
    target=random.choice(role_list); core,extra,_=ROLES[target]
    have=random.sample(core,random.randint(max(1,len(core)-2),len(core)))+random.sample(extra,random.randint(0,2))
    have=list(dict.fromkeys(have))
    subj=random.choice(["CSE","IT","ECE","MCA"])
    cands.append({"id":i,"name":f"{random.choice(FIRST)} {random.choice(LAST)}","college":random.choice(COLLEGES),
      "degree":DEG[subj],"subject":subj,"cgpa":str(round(random.uniform(6.0,9.4),1)),"graduationYear":str(random.choice([2025,2026,2027])),
      "skills":", ".join(have),"projects":f"Built a {target.lower()} project using {', '.join(have[:3])}.",
      "experience":random.choice(["","Internship (3 months)","1 year experience as trainee","Open-source contributor"]),
      "targetRole":target})

json.dump(jobs,open("jobs.json","w"),indent=1,ensure_ascii=False)
json.dump(cands,open("candidates.json","w"),indent=1,ensure_ascii=False)
for name,rows in (("jobs",jobs),("candidates",cands)):
    with open(f"{name}.csv","w",newline="",encoding="utf-8") as f:
        w=csv.DictWriter(f,fieldnames=rows[0].keys()); w.writeheader()
        for r in rows: w.writerow({k:(", ".join(v) if isinstance(v,list) else v) for k,v in r.items()})
print(len(jobs),"jobs,",len(cands),"candidates")
