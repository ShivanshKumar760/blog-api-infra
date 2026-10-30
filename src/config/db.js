import mongoose from 'mongoose';
import config from './index.js';

export default async function connectDB() {
    mongoose.set('strictQuery',true);
    await mongoose.connect(config.mongoUri,{
        serverSelectionTimeoutMS:10000,
    });
    console.log('MongoDB connected');
}
