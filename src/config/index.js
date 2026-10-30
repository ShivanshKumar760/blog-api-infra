import path from 'node:path';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
    path:process.env.ENV_FILE || path.join(__dirname,"../../.env")
});


for (const key of ['MONGODB_URI','JWT_SECRET']){
    if(!process.env[key]){
        console.error(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
}


const config = {
    nodeEnv:process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 3000,
    mongoUri: process.env.MONGODB_URI,
    jwtSecret:process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
};

export default config;


