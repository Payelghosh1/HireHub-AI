"""
Synthetic labelled resume generator (used when no real dataset is supplied).

It is deliberately NOISY so the classifier has to learn, not memorise templates:
 * roles share skills (Full Stack overlaps Frontend/Backend; ML overlaps AI/Data Analyst)
 * only ~50% of a role's core skills appear, plus random distractor skills
 * ~45% of resumes list adjacent-role skills, ~25% a project from an adjacent role, and everyone lists some foreign skills
 * ~40% of resumes carry no role-specific wording in the summary
Replace with the real Kaggle "UpdatedResumeDataSet.csv" via:  python -m app.train --csv path/to/file.csv
"""
import random

ROLES = {
 "Full Stack Developer": dict(core=["React","Node.js","MongoDB","Express","JavaScript","REST API"], extra=["TypeScript","Redux","Docker","Git","HTML","CSS","JWT","PostgreSQL"], adj=["Frontend Developer","Backend Developer"],
    projects=["MERN stack {x} app with authentication","full-stack {x} platform using {a} and {b}","responsive {x} web app with {a} frontend and {b} API"]),
 "Frontend Developer": dict(core=["React","JavaScript","HTML","CSS"], extra=["TypeScript","Redux","Tailwind","Figma","Bootstrap","Vite","Next.js","Git"], adj=["Full Stack Developer"],
    projects=["pixel-perfect {x} UI in {a}","accessible {x} dashboard built with {a} and {b}","responsive {x} landing page using {a}"]),
 "Backend Developer": dict(core=["Node.js","Express","MongoDB","REST API"], extra=["PostgreSQL","Redis","Docker","JWT","GraphQL","Microservices","Git","Linux"], adj=["Full Stack Developer","Java Developer"],
    projects=["scalable {x} REST API with {a} and {b}","{x} service with JWT auth and {a}","event-driven {x} backend using {a}"]),
 "Java Developer": dict(core=["Java","Spring Boot","MySQL","REST API"], extra=["Microservices","Hibernate","Docker","Git","Maven","JUnit","PostgreSQL"], adj=["Backend Developer","Android Developer"],
    projects=["{x} microservice using {a} and {b}","enterprise {x} system in {a}","{x} management app built with {a}"]),
 "Python Developer": dict(core=["Python","Django","PostgreSQL","REST API"], extra=["Flask","FastAPI","Docker","Git","AWS","Celery","Redis","Linux"], adj=["Data Analyst","Backend Developer"],
    projects=["{x} web app using {a} and {b}","automation scripts for {x} in {a}","{x} API built with {a}"]),
 "Data Analyst": dict(core=["Python","SQL","Pandas","NumPy"], extra=["Tableau","Excel","Power BI","Matplotlib","Statistics","Machine Learning","Jupyter"], adj=["Machine Learning Engineer","Python Developer"],
    projects=["{x} analysis dashboard using {a} and {b}","exploratory data analysis of {x} with {a}","{x} reporting pipeline in {a}"]),
 "Machine Learning Engineer": dict(core=["Python","Machine Learning","TensorFlow","Pandas","Scikit-learn"], extra=["PyTorch","NumPy","Deep Learning","Computer Vision","Docker","AWS","Statistics","Jupyter"], adj=["Data Analyst","AI Engineer"],
    projects=["{x} prediction model using {a} and {b}","{x} classifier trained with {a}","computer vision system for {x} using {a}"]),
 "AI Engineer": dict(core=["Python","LLM","RAG","Prompt Engineering","LangChain"], extra=["FastAPI","NLP","Docker","Generative AI","Vector Database","PyTorch","Machine Learning","Git"], adj=["Machine Learning Engineer","Python Developer"],
    projects=["{x} chatbot using {a} and {b}","RAG assistant over {x} documents with {a}","LLM-powered {x} summariser built with {a}"]),
 "DevOps Engineer": dict(core=["Docker","Kubernetes","AWS","Linux","CI/CD"], extra=["Bash","Terraform","Jenkins","Azure","Git","Ansible","Python","Prometheus"], adj=["Backend Developer"],
    projects=["{x} CI/CD pipeline with {a} and {b}","containerised {x} deployment on {a}","{x} infrastructure automation using {a}"]),
 "Android Developer": dict(core=["Kotlin","Java","Android","REST API"], extra=["Firebase","Jetpack Compose","Git","Room","Retrofit","MVVM","Material Design"], adj=["Java Developer"],
    projects=["{x} Android app in {a} with {b}","offline-first {x} mobile app using {a}","{x} app with Firebase and {a}"]),
 "QA / Test Engineer": dict(core=["Selenium","Jest","Postman","Test Automation"], extra=["JavaScript","Python","CI/CD","SQL","Git","Cypress","JIRA","Agile"], adj=["Backend Developer"],
    projects=["automated {x} test suite using {a} and {b}","API testing framework for {x} with {a}","regression suite for {x} in {a}"]),
}
DISTRACTORS = ["Git","Linux","Excel","Communication","Agile","Problem Solving","SQL","HTML","Python","Java","Teamwork","Data Structures","OOP","MS Office","Leadership"]
DOMAINS = ["e-commerce","job portal","hospital","library","food delivery","banking","student","inventory","chat","travel","fitness","news","ticketing","payroll","real-estate"]
GENERIC = ["Motivated engineering student seeking opportunities to apply technical skills.","Final-year student passionate about building useful software.","Quick learner looking for an entry-level technology role.","Detail-oriented graduate eager to contribute to a team."]
EXP = ["", "Internship (3 months) at a local startup.", "Completed a 6-week training programme.", "Open-source contributor.", "1 year experience as a trainee engineer.", "Hackathon finalist."]
COLLEGES = ["Jadavpur University","NIT Durgapur","VIT Vellore","IIIT Hyderabad","BITS Pilani","Anna University","SRM University","KIIT","Manipal Institute of Technology"]

def _project(rng, role, skills):
    spec = ROLES[role]
    a = rng.choice(skills) if skills else "Python"
    b = rng.choice(skills) if skills else "Git"
    return rng.choice(spec["projects"]).format(x=rng.choice(DOMAINS), a=a, b=b)

def make_resume(rng, role):
    spec = ROLES[role]
    skills = [s for s in spec["core"] if rng.random() < 0.5] + [s for s in spec["extra"] if rng.random() < 0.3]
    skills += rng.sample(DISTRACTORS, rng.randint(3, 6))
    # people list skills from other roles too (courses, curiosity): random foreign skills for every resume
    foreign = [sk for r2, sp in ROLES.items() if r2 != role for sk in sp["core"]]
    skills += rng.sample(foreign, rng.randint(1, 3))
    if rng.random() < 0.45:  # adjacent-role leakage
        adj = rng.choice(spec["adj"]); skills += rng.sample(ROLES[adj]["core"], 3)
    skills = list(dict.fromkeys(skills)) or ["Python"]; rng.shuffle(skills)
    summary = (f"Aspiring {role} with hands-on project experience." if rng.random() < 0.25
               else rng.choice(GENERIC))
    projects = [_project(rng, role, skills) for _ in range(rng.randint(1, 3))]
    if rng.random() < 0.35:
        projects.append(_project(rng, rng.choice(spec["adj"]), skills))
    lines = [f"Summary: {summary}", f"Skills: {', '.join(skills)}", "Projects:"] + [f"- Built {p}." for p in projects]
    e = rng.choice(EXP)
    if e: lines.append(f"Experience: {e}")
    lines.append(f"Education: B.Tech, {rng.choice(COLLEGES)}, CGPA {round(rng.uniform(6.0, 9.4), 1)}")
    return "\n".join(lines)

def generate(n_per_role=250, seed=7):
    rng = random.Random(seed)
    rows = [(make_resume(rng, r), r) for r in ROLES for _ in range(n_per_role)]
    rng.shuffle(rows)
    return rows
