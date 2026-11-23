import joblib, json
clf = joblib.load("/home/claude/work/hirehub-final/ml-service/artifacts/classifier.joblib")
tf, lr = clf.steps[0][1], clf.steps[1][1]
vocab = [None]*len(tf.vocabulary_)
for t,i in tf.vocabulary_.items(): vocab[int(i)] = t
m = {"classes": [str(c) for c in lr.classes_], "vocab": vocab, "idf": [round(float(x),5) for x in tf.idf_],
     "coef": [[round(float(x),4) for x in row] for row in lr.coef_], "intercept": [round(float(x),5) for x in lr.intercept_]}
json.dump(m, open("model.json","w"), separators=(",",":"))
met = json.load(open("/home/claude/work/hirehub-final/ml-service/artifacts/metrics.json"))
json.dump({"accuracy":met["accuracy"],"macro_f1":met["macro_f1"],"data_source":met["data_source"],"n_train":met["n_train"],"n_test":met["n_test"],"retrieval":met["retrieval"]}, open("metrics_small.json","w"))
print("vocab",len(vocab),"classes",len(lr.classes_))
