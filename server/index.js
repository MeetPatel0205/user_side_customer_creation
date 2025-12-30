import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from './db.js';
import User from './models/User.js';
import Customer from './models/Customer.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json());

// Middleware to authenticate user
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.userId = user.id;
        next();
    });
};

// Auth Routes

// Signup
app.post('/auth/signup', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    try {
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();

        const token = jwt.sign({ id: newUser._id, email }, SECRET_KEY, { expiresIn: '1h' });
        res.status(201).json({ token, user: { id: newUser._id, email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token, user: { id: user._id, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Customer Routes

// Get all customers for the logged-in user
app.get('/customers', authenticateToken, async (req, res) => {
    try {
        const customers = await Customer.find({ user: req.userId });
        // Map _id to id for frontend compatibility if needed, or just return _id
        // Providing id alias for consistent frontend usage
        const formattedCustomers = customers.map(c => ({
            id: c._id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            user_id: c.user
        }));
        res.json(formattedCustomers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// Create a new customer
app.post('/customers', authenticateToken, async (req, res) => {
    const { name, email, phone } = req.body;
    if (!name || !email || !phone) return res.status(400).json({ error: 'Name, email, and phone required' });

    try {
        const newCustomer = new Customer({
            name,
            email,
            phone,
            user: req.userId
        });
        await newCustomer.save();

        res.status(201).json({
            id: newCustomer._id,
            name,
            email,
            phone,
            user_id: req.userId
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create customer' });
    }
});

// Update a customer
app.put('/customers/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    try {
        // Find customer by ID AND User ID to ensure ownership
        const customer = await Customer.findOne({ _id: id, user: req.userId });

        if (!customer) return res.status(404).json({ error: 'Customer not found or access denied' });

        customer.name = name || customer.name;
        customer.email = email || customer.email;
        customer.phone = phone || customer.phone;

        await customer.save();

        res.json({
            id: customer._id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            user_id: req.userId
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

// Delete a customer
app.delete('/customers/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await Customer.deleteOne({ _id: id, user: req.userId });

        if (result.deletedCount === 0) return res.status(404).json({ error: 'Customer not found or access denied' });
        res.json({ message: 'Customer deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
