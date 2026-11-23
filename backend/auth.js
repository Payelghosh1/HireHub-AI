const jwt = require("jsonwebtoken");
let SECRET = process.env.JWT_SECRET;
if (!SECRET) { SECRET = "dev-only-secret-change-me"; console.warn("[auth] JWT_SECRET not set - using an insecure dev secret. Set it in .env for any real deployment."); }

const sign = (u) => jwt.sign({ id: u.id, role: u.role, name: u.name }, SECRET, { expiresIn: "7d" });

/** Express middleware. requireAuth() = any logged-in user; requireAuth("recruiter") = specific role(s). */
const requireAuth = (...roles) => (req, res, next) => {
  const h = req.headers.authorization || "";
  try {
    req.user = jwt.verify(h.replace(/^Bearer\s+/i, ""), SECRET);
  } catch { return res.status(401).json({ message: "Please sign in." }); }
  if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ message: `This action needs a ${roles.join(" / ")} account.` });
  next();
};
const optionalAuth = (req, _res, next) => { try { req.user = jwt.verify((req.headers.authorization || "").replace(/^Bearer\s+/i, ""), SECRET); } catch {} next(); };
module.exports = { sign, requireAuth, optionalAuth };
