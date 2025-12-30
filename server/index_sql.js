import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB, { sequelize } from './db_sql.js';
import User from './models_sql/User.js';
import Customer from './models_sql/Customer.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

// Connect to Database
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
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ error: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ email, password: hashedPassword });

        const token = jwt.sign({ id: newUser.id, email }, SECRET_KEY, { expiresIn: '1h' });
        res.status(201).json({ token, user: { id: newUser.id, email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Customer Routes

// Get all customers for the logged-in user
app.get('/customers', authenticateToken, async (req, res) => {
    try {
        const customers = await Customer.findAll({ where: { userId: req.userId } });
        // Map fields if necessary, but Sequelize returns fields directly
        res.json(customers);
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
        const newCustomer = await Customer.create({
            name,
            email,
            phone,
            userId: req.userId
        });

        res.status(201).json(newCustomer);
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
        const customer = await Customer.findOne({ where: { id, userId: req.userId } });

        if (!customer) return res.status(404).json({ error: 'Customer not found or access denied' });

        // Update fields
        customer.name = name || customer.name;
        customer.email = email || customer.email;
        customer.phone = phone || customer.phone;

        await customer.save();

        res.json(customer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

// Delete a customer
app.delete('/customers/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await Customer.destroy({ where: { id, userId: req.userId } });

        if (result === 0) return res.status(404).json({ error: 'Customer not found or access denied' });
        res.json({ message: 'Customer deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
});

// Sync database and start server
sequelize.sync({ alter: true }).then(() => {
    console.log('Database synced');
    app.listen(PORT, () => {
        console.log(`Server (MySQL) running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to sync database:', err);
});
