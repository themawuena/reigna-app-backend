import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import bcrypt from "bcrypt";

const Admin = sequelize.define(
  "Admin",
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
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "admin",
    },
  },
  {
    tableName: "admins",
    timestamps: true,

    hooks: {
      // 🔐 Hash password on create OR update
      beforeSave: async (admin) => {
        if (admin.changed("password")) {
          const salt = await bcrypt.genSalt(10);
          admin.password = await bcrypt.hash(admin.password, salt);
        }
      },
    },
  }
);

// 🔐 Compare plain password with hashed password in DB
Admin.prototype.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

export default Admin;
