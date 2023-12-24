import mongoose from "mongoose";
import { DBNAME } from "../constants.js";

const connectDatabase = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DBNAME}`
    );
    console.log(
      `\nMONGODB connected! Host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MONGODB connection error: ", error);
    process.exit(1);
  }
};

export default connectDatabase;
