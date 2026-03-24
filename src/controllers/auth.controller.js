const authService = require("../services/auth.service");

function isValidName(name, email) {
  if (!name || typeof name !== "string") return false;
  const n = String(name).trim();
  const e = String(email).toLowerCase().trim();
  if (!n) return false;
  if (n.toLowerCase() === e) return false;
  if (n.toLowerCase() === e.split("@")[0]) return false;
  return true;
}

function normalizeUsername(u) {
  return String(u).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

const register = async (req, res, next) => {
  try {
    const { username, email, password, name } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email, and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }
    const usernameNorm = normalizeUsername(username);
    if (usernameNorm.length < 2) {
      return res.status(400).json({ message: "Username must be at least 2 characters (letters, numbers, underscores, hyphens only)." });
    }
    if (!isValidName(name, email)) {
      return res.status(400).json({
        message: "Name is required and must be different from your email (use your real name, not your email address).",
      });
    }
    const emailNorm = String(email).toLowerCase().trim();
    const [existingByUsername, existingByEmail] = await Promise.all([
      authService.findByUsername(usernameNorm),
      authService.findByEmail(emailNorm),
    ]);
    if (existingByUsername) {
      return res.status(400).json({ message: "This username is already taken." });
    }
    if (existingByEmail) {
      return res.status(400).json({ message: "An account with this email already exists." });
    }
    const hashed = await authService.hashPassword(password);
    const prisma = require("../lib/prisma");
    const user = await prisma.user.create({
      data: {
        username: usernameNorm,
        email: emailNorm,
        password: hashed,
        name: String(name).trim(),
        isAdmin: false,
        isUser: true,
      },
      include: { groups: { include: { group: true } } },
    });
    const safeUser = authService.toSafeUser(user);
    req.session.user = safeUser;
    req.session.save((err) => {
      if (err) return next(err);
      return res.status(201).json({ user: safeUser });
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    let user;
    try {
      user = await authService.findByUsername(username);
    } catch (dbError) {
      if (dbError.message?.includes("findUnique") || dbError.message?.includes("prisma")) {
        return res.status(500).json({
          message: "Database not ready. Run: npx prisma generate && npx prisma migrate deploy",
        });
      }
      throw dbError;
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const valid = await authService.verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid username or password." });
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

const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Email is required." });
    }

    const result = await authService.createPasswordResetToken(email.trim().toLowerCase());
    // Always return success to avoid leaking whether an email exists
    const baseUrl = (process.env.APP_URL || process.env.BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || "")
      .replace(/\/$/, "");
    const baseFull = baseUrl ? (baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`) : "";

    if (result && baseFull) {
      const resetLink = `${baseFull}/reset-password.html?token=${encodeURIComponent(result.token)}`;
      const mailService = require("../services/mail.service");
      try {
        await mailService.sendPasswordResetEmail(result.user.email, resetLink, result.user.name);
      } catch (mailErr) {
        console.error("Password reset email failed:", mailErr.message);
        return res.status(500).json({ message: "Failed to send email. Please try again later." });
      }
    }

    res.status(200).json({
      message: "If an account exists with that email, you will receive a password reset link.",
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const user = await authService.findUserByResetToken(token);
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
    }

    const hashed = await authService.hashPassword(newPassword);
    await authService.clearPasswordReset(user.id);
    const prisma = require("../lib/prisma");
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    res.status(200).json({ message: "Password reset successfully. You can now sign in." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  me,
  requestPasswordReset,
  resetPassword,
};
