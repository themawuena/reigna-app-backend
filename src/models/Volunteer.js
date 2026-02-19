import { DataTypes } from "sequelize";
import sequelize from "../config/db.js"; // your existing Sequelize instance
import bcrypt from "bcrypt";

const Volunteer = sequelize.define(
  "Volunteer",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    postcode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "volunteers",
    hooks: {
      beforeCreate: async (volunteer) => {
        const salt = await bcrypt.genSalt(10);
        volunteer.password = await bcrypt.hash(volunteer.password, salt);
      },
    },
  }
);

export default Volunteer;
