import {v2 as cloudinary} from "cloudinary"
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
    api_key: process.env.CLOUDINARY_API_KEY?.trim(),
    api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
})


const uploadOnCloudinary = async(localFilePath) => {
    try {
        if(!localFilePath) return null
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
        const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
        // Log config minimally (don't print secrets)
        console.log('Cloudinary config (masked):', { cloud_name: cloudName, api_key_last4: apiKey ? apiKey.slice(-4) : null })
        // uploading the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto" // Whatever type of file you wanna upload you can. Figure it out yourself
        })

        console.log("File uploaded successfully on Cloudinary", response.url)
        return response
    } catch (error) {
        // Log full error object so callers see HTTP code and details
        console.error("Cloudinary upload failed:", error)
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath) // remove the locally saved temporary file after a failed upload
        }
        return null;
    }
}

export {uploadOnCloudinary}
