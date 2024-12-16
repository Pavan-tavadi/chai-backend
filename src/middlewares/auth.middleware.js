import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookie?.accessToken ||
      req.header("Autorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "unautorized error");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password - refrenceToken"
    );
    if (!user) {
      throw new ApiError(401, "invalid accesstoken");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(402, error?.message || "invalid accesstoken");
  }
});
