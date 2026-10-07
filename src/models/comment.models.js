import mongoose ,{ Schema } from 'mongoose'

const commentSchema = new Schema({
    post:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    commentAuthor:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content:{
        type: String,
        trim: true,
        required: true,
        maxLength: 1000 //Maximum length of the comment can be a 1000 letters.
    }
}, {timestamps: true})

export const Comment = mongoose.model("Comment", commentSchema)