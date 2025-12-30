import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MySQL database using Sequelize
// XAMPP default credentials: user='root', password='', database='customer_manager'
// Adjust as needed if user has set a password.
const sequelize = new Sequelize('customer_manager', 'root', '', {
    host: 'localhost',
    dialect: 'mysql',
    logging: console.log, // Set to console.log to see SQL queries
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('MySQL (Sequelize) connected successfully.');
        // Sync models with database
        // await sequelize.sync({ alter: true }); // Updates tables if models change
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
};

export { sequelize };
export default connectDB;
