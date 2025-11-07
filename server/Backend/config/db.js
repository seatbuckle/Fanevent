import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const connectDB = async() =>{
    try{
        mongoose.connection.on('connected', ()=> console.log('Database connected'));
        await mongoose.connect(`${process.env.MONGO_URI}`);

    } catch (error) {
        console.log(error.message);

    }
}

export default connectDB;
// export const connectDB = async () => {
//     try {
//         const conn = await mongoose.connect(process.env.MONGO_URI);
//         console.log(`MongoDB Connected: ${conn.connection.host}`);
//     } catch (error) {
//         console.error(`Error: ${error.message}`);
//         process.exit(1); // process code 1 code means exit with failure, 0 means success
//     }
// };