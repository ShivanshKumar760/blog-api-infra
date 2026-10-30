import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
    {
        title:{type:String,required:true,trim:true,maxlength:200},
        content:{type:String,required:true,maxlength:50000},
        tags: {type:[String],default:[],index:true},
        published:{type:Boolean,default:true},
        author:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
    },{timestamps:true}
);

postSchema.index({createdAt:-1});
const Post = mongoose.model('Post',postSchema)
export default Post;