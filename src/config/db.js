import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",

  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },

  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },

  logging: false
});

try {
  await sequelize.authenticate();
  console.log("✅ Database connected successfully");
} catch (error) {
  console.error("❌ Database connection failed:", error);
}

export default sequelize;
