const authService = require("../services/auth.service");

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    let user;
    try {
      user = await authService.findByEmail(email);
    } catch (dbError) {
      if (dbError.message?.includes("findUnique") || dbError.message?.includes("prisma")) {
        return res.status(500).json({
          message: "Database not ready. Run: npx prisma generate && npx prisma migrate deploy",
        });
      }
      throw dbError;
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const valid = await authService.verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const safeUser = authService.toSafeUser(user);
    req.session.user = safeUser;
    req.session.save((err) => {
      if (err) return next(err);
      return res.status(200).json({ user: safeUser });
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    req.session.destroy((err) => {
      if (err) return next(err);
      return res.status(200).json({ message: "Logged out." });
    });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const user = req.session?.user;
    if (!user) {
      return res.status(401).json({ message: "Not authenticated." });
    }
    return res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  me,
};
