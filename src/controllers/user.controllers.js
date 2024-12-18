import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudunary } from "../utils/cloudunary.js";
import { Apirefrence } from "../utils/Apirefrence.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refereshToken = user.generateRefreshToken();

    user.refereshToken = refereshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refereshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "somthing went wrong while generating access and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  /**
   * get user details from front end
   * validation-not empty
   * check if user is already exists : user,email
   * check fro image ,check for avatar
   * upload them to cloudinary ,avatar
   * create user object -craete entry in db
   * remove password and refresh token field from response
   */

  const { fullname, email, username, password } = req.body;
  console.log("email", email);

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all feilds are required");
  }
  const exiatedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (exiatedUser) {
    throw new ApiError(400, "User with email or username exists");
  }

  console.log("from req.files", req.files);

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar required");
  }

  const avatar = await uploadOnCloudunary(avatarLocalPath);
  const coverImage = await uploadOnCloudunary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "avatar required");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  //._id is created autometicallly when user is created
  const createdUser = await User.findById(user._id).select(
    "-password -refrenceToken "
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering user");
  }

  return res
    .status(201)
    .json(new Apirefrence(201, createdUser, "User registered siccessfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  /*
req body->data
username or gmail
find the user
password check
access and refresh token
send cookie
*/
  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }], //$or is mongodb opraters
  });
  if (!username) {
    throw new ApiError(404, "user does not exists");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "password in currect");
  }

  const { accessToken, refereshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refrenceToken"
  );

  const options = {
    httpOnly: true, //referesh token can not be modified by front end by user
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refereshtoken", refereshToken, options)
    .json(
      new Apirefrence(
        200,
        {
          user: loggedInUser,
          accessToken,
          refereshToken,
        },
        "user logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refrenceToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true, //referesh token can not be modified by front end by user
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refrenceToken", options)
    .json(new Apirefrence(200, {}, "user logged out"));
});

const refershAccessToken = asyncHandler(async (req, res) => {
  const incomingREfreshtoken =
    req.cookie.refereshToken || req.body.refereshToken;

  if (!incomingREfreshtoken) {
    throw new ApiError(401, "unautorized request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingREfreshtoken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "invalid refreshtoken ");
    }

    if (incomingREfreshtoken !== user?.refrenceToken) {
      throw new ApiError(401, "refresh token is expired or used ");
    }

    const options = {
      httpOnly: true, //referesh token can not be modified by front end by user
      secure: true,
    };

    const { accessToken, newRefereshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .clearCookie("accessToken", accessToken, options)
      .clearCookie("refrenceToken", newRefereshToken, options)
      .json(
        new Apirefrence(
          200,
          { accessToken, newRefereshToken },
          "access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(400, error?.meassage || "invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "invalid old password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new Apirefrence(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "current user fetched successfully");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if (!fullname || !email) {
    throw new ApiError(400, "all fields are required");
  }
  const user = User.findByIdAndUpdate(
    req.user?._id,
    { $set: { fullname, email } },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new Apirefrence(200, "account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file is missing");
  }

  const avatar = await uploadOnCloudunary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploadin avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new Apirefrence(200, "avatar is updated successdully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage file is missing");
  }

  const coverImage = await uploadOnCloudunary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploadin coverImage");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: coverImage.url } },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new Apirefrence(200, "Cover image is updated successdully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refershAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
