import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Use a local MongoDB URI if not provided in environment variables
// For beginner level, local instance is standard.
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/customer_manager';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

export default connectDB;
