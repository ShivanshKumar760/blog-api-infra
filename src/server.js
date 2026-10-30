import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import config from './config/index.js';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';

import { notFound,errorHandler } from './middleware/error.js';


const app = express();

app.set('trust proxy',2);

app.use(helmet());
app.use(cors());
app.use(express.json({limit:'100kb'}));
app.use(morgan(config.nodeEnv==='production'?'combined':'dev'));


app.get('/health',(_req,res)=>{
    return res.json({status:'ok'});
});


app.get('/ready',(_req,res)=>{
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200:503).json({db:ready ? 'connected':'disconnected'});
});

const authLimiter = rateLimit({
    windowMs:15*60*1000,
    limit:50,
    standardHeaders:true,
    legacyHeaders:false,
    message:{error:'Too many attempts , try again later'},
});

const apiLimiter=rateLimit({
    windowMs:60*1000,
    limit:120,
    standardHeaders:true,
    legacyHeaders:false,
});

app.use('/api/auth',authLimiter,authRoutes);
app.use('/api/posts',apiLimiter,postRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
    await connectDB();
    const server = app.listen(config.port,'127.0.0.1',()=>{
        console.log(`blog-api listening on 127.0.0.1:${config.port}(${config.nodeEnv})`);
    });
    const shutdown = (signal) =>
    {
        console.log(`${signal} received, shutting down`);
        server.close(async () => {
        await mongoose.connection.close();
        process.exit(0);
        });
        setTimeout(() => process.exit(1), 8000).unref();
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
}

start().catch((err)=>{
    console.error('Failed to start:',err.message);
    process.exit(1);
});