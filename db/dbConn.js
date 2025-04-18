import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const { connection } = await mongoose.connect(`${process.env.DATABASE_URI}/${process.env.DB_NAME}`);
        console.log("DB successfully connected, host : ", connection.host);
    } catch (error) {
        console.log("Mongodb connection failed", error);
        process.exit(1);
    }
};

export default connectDB;
