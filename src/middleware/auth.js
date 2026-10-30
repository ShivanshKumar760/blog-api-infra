import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req ,res ,next)=>{
    const [schema,token]=(req.headers.authorization || '').split(' ');
    if(schema!=='Bearer' || !token){
        return res.status(401).json({error:'Authentication required'});
    }

    let payload ;
    try {
        payload = jwt.verify(token,config.jwtSecret,{algorithms:['HS256']});
    }catch{
        return res.status(401).json({error:'Invalid or expired token'});
    }

    const user = await User.findById(payload.sub);
    if(!user) return res.status(401).json({error:'User no longer exists'});

    req.user = user;
    next();
});


export const requiredRole = (...roles)=>(req,res,next)=>{
    if (!roles.includes(req.user.role)){
        return res.status(403).json({error:'Forbidden'});
    }
    next();
};

export const signToken = (user) => {
    return jwt.sign({sub:user.id,role:user.role},config.jwtSecret,{algorithms:'HS256',expiresIn:config.jwtExpiresIn,});
};