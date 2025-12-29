import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Client = sequelize.define(
  "Client",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    postcode: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "clients",
    timestamps: true,
  }
);

export default Client;
