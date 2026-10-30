import express from 'express';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { protect,signToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', asyncHandler(async (req, res) => {
    const { name, email, password } = req.body || {};

    // 1. Validate Types
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Name, email, and password are required strings' });
    }

    // 2. Validate Password Length
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // 3. Check if User Already Exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
        return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // 4. Create User (Ensure your User schema has a pre-save hook to hash the password!)
    const insertingUser = new User({ 
        name, 
        email: email.toLowerCase(), 
        password 
    });
    await insertingUser.save();

    // 5. Secure Response (Do NOT send the password back)
    res.status(201).json({
        user: {
            id: insertingUser._id,
            name: insertingUser.name,
            email: insertingUser.email
        },
        token: signToken(insertingUser._id) // Best practice: Sign the token using the ID, not the whole object
    });
}));


// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    // Same message for unknown email and wrong password, to avoid user enumeration
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ user, token: signToken(user) });
  })
);

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

export default router;
