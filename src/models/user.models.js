import mongoose, {Schema} from mongoose

const userSchema = new Schema({
    username:{
        type:String,
        requred:true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: false
    },
    about:{
        type: String,
    },
    avatar:{
        type: String,
        required: true
    }
},{timestamps: true})

export const User = mongoose.model("User", userSchema)