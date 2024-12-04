import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARI_CLOUD_NAME,
  api_key: process.env.CLOUDINARI_API_KEY,
  api_secret: process.env.CLOUDINARI_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudunary = async (localFilePasth) => {
  try {
    if (!localFilePasth) return null;
    //uploading on cloudinary
    const response = await cloudinary.uploader.upload(localFilePasth, {
      resource_type: "auto",
    });
    //file added successfully
    console.log("file added successfully", response.url);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePasth); //romove the locally saved temporary file as the upload operation get failed
    return null;
  }
};

export { uploadOnCloudunary };
