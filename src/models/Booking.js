import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Client from "./Client.js";
import Carer from "./Carer.js";

const Booking = sequelize.define(
  "Booking",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Client,
        key: "id",
      },
    },
    carer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Carer,
        key: "id",
      },
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    time: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    service_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    service_hrs: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    location: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'Unknown',
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "pending",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    total_cost: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    payment_status: {
      type: DataTypes.STRING,
      defaultValue: "pending", // pending, paid, failed
    },

  },
  {
    tableName: "bookings",
    timestamps: true,
  }
);


// Relationships
Client.hasMany(Booking, { foreignKey: "client_id" });
Booking.belongsTo(Client, { foreignKey: "client_id" });

Carer.hasMany(Booking, { foreignKey: "carer_id" });
Booking.belongsTo(Carer, { foreignKey: "carer_id" });

export default Booking;
