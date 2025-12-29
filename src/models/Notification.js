import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Carer from "./Carer.js";

const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    carer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "carers", key: "id" },
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "notifications",
    timestamps: true,
  }
);

Notification.belongsTo(Carer, { foreignKey: "carer_id" });

export default Notification;
