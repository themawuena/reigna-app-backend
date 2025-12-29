import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Carer = sequelize.define(
  "Carer",
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
      unique: true,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mobile_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    charge_hrs: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    postcode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    experience_years: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    care_types: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    availability: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    about_me: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rtw_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    id_document: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    right_to_work_status: {
      type: DataTypes.ENUM("declared", "pending", "verified"),
      defaultValue: "pending",
    },
    dbs_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dbs_status: {
      type: DataTypes.ENUM("declared", "pending", "verified"),
      defaultValue: "pending",
    },
    status: {
      type: DataTypes.ENUM("draft", "pending", "active"),
      defaultValue: "pending",
    },
    profile_image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fcm_token: {
      type: DataTypes.STRING,
      allowNull: true,
   },

  },
  {
    tableName: "carers", // ✅ explicit table name
    timestamps: true,
  }
);

export default Carer;
