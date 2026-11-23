import json,base64,re
S='/home/claude/work/hirehub-final/backend/ai/'
t=open('template.html').read()
nlp=open(S+'nlp.js').read()
res=open(S+'resume.js').read()
res=res[res.index('/** Heuristic structured parse'):res.index('module.exports')]+'\nmodule.exports={localParse,localResumeTips};\n'
nm='node_modules/'
pdf=open(nm+'pdfjs-dist/build/pdf.min.js').read()
mam=open(nm+'mammoth/mammoth.browser.min.js').read()
wk=base64.b64encode(open(nm+'pdfjs-dist/build/pdf.worker.min.js','rb').read()).decode()
rep={'/*PDFJS*/':pdf,'/*MAMMOTH*/':mam,'/*MODEL*/':open('model.json').read(),'/*JOBS*/':open('jobs.json').read(),'/*METRICS*/':open('metrics_small.json').read(),'/*WORKER*/':wk,'/*NLP*/':nlp,'/*RESUME*/':res}
for k,v in rep.items():
    assert k in t,k
    t=t.replace(k,v)
open('resume-check.html','w').write(t)
print(len(t))
