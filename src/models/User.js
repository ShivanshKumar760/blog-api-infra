import mongoose from "mongoose";
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name : {type:String,required:true,trim:true,maxlength:80},
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        match:[/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },

    password:{type:String,required:true,minlength:8,select:false},
    role:{type:String,enum:['user','admin'],default:'user'},
},{timestamps:true});

userSchema.pre('save',async function (next) {
    if(!this.isModified('password')) return next();  
    this.password = await bcrypt.hash(this.password,12);
    next();  
});

userSchema.methods.comparePassword = function (canidate){
    return bcrypt.compare(canidate,this.password);
}


userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);