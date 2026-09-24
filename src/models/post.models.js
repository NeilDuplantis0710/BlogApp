import mongoose, {Schema} from "mongoose";
import { lowercase, uppercase } from "zod";

const postSchema = new Schema({
    postName:{
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    postAuthor:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    postSubConnet:{
        type: String,
        required: false,
        lowercase: true
    },
    postTag: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    postContent: {
        type: String,
        required: true,
        lowercase: true
    }
}, {timestamps: true})

export const Post = mongoose.model("Post", postSchema)