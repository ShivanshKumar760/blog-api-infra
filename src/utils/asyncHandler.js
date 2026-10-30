//Forwars rejected promises to express error 
//middleware (express 4 doesnt do this itself)

const asyncHandler = (fn)=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);

export default asyncHandler;