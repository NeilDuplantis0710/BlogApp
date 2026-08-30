import {v2 as cloudinary} from "cloudinary"
import { response } from "express"
import fs from 'fs'
import { loadEnvFile } from "process"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})


const uploadOnCloudinary = async(localFilePath) => {
    try {
        if(!localFilePath) return null
        // uploading the file on cloudinary
        cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto" // Whatever type of file you wanna upload you can. Figure it out yourself
        })
        console.log("File is not uploaded successfully on cloudinary", response.url)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally saved termporary file as the upload operation got failed
        return null;
    }
}

export {uploadOnCloudinary}