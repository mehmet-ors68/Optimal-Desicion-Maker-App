const express = require('express');
const router = express.Router();
require('dotenv').config({ path: '../../.env' });

const JWT_SECRET = process.env.JWT_SECRET_CODE; 
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const { doesUsernameExist, doesEmailExist, createNewUser, getUserByUsername } = require('../db/dbFunctions');

//login and generate token

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1️⃣ Get user from DB by username
    const user = await getUserByUsername(username);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 2️⃣ Compare entered password with stored hash
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3️⃣ Generate JWT with userId and username
    const token = jwt.sign({ userId: user.userId, username: user.username }, JWT_SECRET, {
      expiresIn: "1h",
    });

    // 4️⃣ Set token as secure HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 3600000, // 1 hour
    });

    res.json({ message: "Login successful" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/register", async (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ message: "username, password and email are required" });
    }

    try {
        // Step 1: Check if username or email already exists.
        // These were previously called with no arguments, so the check always
        // passed and the duplicate only failed later on the UNIQUE constraint.
        if (await doesUsernameExist(username))
            return res.status(409).json({ usernameExists: true });

        if (await doesEmailExist(email))
            return res.status(409).json({ existingEmail: true });

        // Step 2: Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Step 3: Insert new user into DB and read back the row we just created.
        // The JWT below needs the generated userId, which only the insert knows.
        await createNewUser(username, hashedPassword, email);
        const user = await getUserByUsername(username);

        if (!user) {
            return res.status(500).json({ message: "Could not create user" });
        }

        // Step 4: Generate JWT containing userId
        const token = jwt.sign({ userId: user.userId, username: user.username }, JWT_SECRET, { expiresIn: "1h" });

        // Step 5: Set token cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 3600000
        });

        res.status(201).json({ message: "Registration successful" });
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


router.get("/protected", (req, res) => {

    const token = req.cookies.token;

    if (!token) return res.status(401).json({ message: "No token found" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ message: "Protected data", user: decoded.username });
    } catch (err) {
        res.status(403).json({ message: "Invalid or expired token" });
    }
});


router.get("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        sameSite: "None",
        secure: true
    });
    res.json({ message: "Logged out" });
});


module.exports = router;


