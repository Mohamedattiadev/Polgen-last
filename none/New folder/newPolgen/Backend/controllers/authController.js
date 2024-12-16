import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import User from '../models/User.js';
import {
  sendRegistrationEmail,
  sendPasswordResetEmail,
  sendContactEmail,
} from '../services/email/emailService.js';

// Register User Handler
export const registerUser = async (req, res, next) => {
  const { username, email, password, phone, address, role } = req.body;
  try {
    // Check for duplicate email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists.' });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = role && ['user', 'admin'].includes(role) ? role : 'user';

    // Create the user in the database
    const user = await User.create({ username, email, password: hashedPassword, phone, address, role: assignedRole });

    // Send registration email
    await sendRegistrationEmail(email, username, password);
    
    // Return success response
    res.status(201).json({ message: 'User registered successfully.', user });
  } catch (error) {
    next(error);
  }
};

// Login User Handler
export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    // Find the user by email
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    // Compare password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

    // Create a JWT token and send it back
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login successful.', token, user });
  } catch (error) {
    next(error);
  }
};

// Get User Profile Handler (simplified)
export const getUserProfile = async (req, res, next) => {
  const userId = req.user.id; // Get user ID from JWT token

  try {
    // Fetch user by ID from the database
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Return the user profile
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// Contact Us Handler
export const contactUs = async (req, res, next) => {
  const { name, email, message } = req.body;
  try {
    if (!name || !email || !message) throw new Error('All fields are required.');
    await sendContactEmail(name, email, message);
    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (error) {
    next(error);
  }
};

// Forgot Password Handler
export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(200).json({
        emailExists: false,
        message: 'If the email exists, a reset link has been sent.',
      });
    }

    // Generate reset token and hash it
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetToken = hashedToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send password reset email with the reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset_password/${resetToken}`;
    await sendPasswordResetEmail(user.email, resetLink);

    res.status(200).json({
      emailExists: true,
      message: 'If the email exists, a reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password Handler
export const resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;
  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      where: { resetToken: hashedToken, resetTokenExpiry: { [Op.gt]: Date.now() } },
    });

    if (!user) return res.status(400).json({ error: 'Invalid or expired token.' });

    // Hash the new password and update the user's password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully.' });
  } catch (error) {
    next(error);
  }
};

// Update User Profile Handler
export const updateUserProfile = async (req, res) => {
  const userId = req.user.id;  // Get user ID from JWT token
  const { username, email, phone, address } = req.body;

  try {
    // Find the user by ID (from the JWT token)
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // If username is being changed, check if the new username is already taken
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ error: 'Username is already taken.' });
      }
    }

    // Update the user's profile data
    await user.update({ username, email, phone, address });

    // Return the updated user profile (including the new username)
    return res.json({ message: 'Profile updated successfully.', user });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
};
