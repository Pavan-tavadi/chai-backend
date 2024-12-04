import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchems = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercasse: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercasse: true,
      trim: true,
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String,
      required: true, //clouednary url
    },
    coverImage: {
      type: String,
    },
    watchHistory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
    },
    password: {
      type: String,
      required: [true, "password required"],
    },
    refrenceToken: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchems.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); //here you dont use if then the code will run every tine and store password every time which is bad
  //now this code runs only when the passsword changes
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchems.methods.isPasswordCorrect = async function (passsword) {
  return await bcrypt.compare(passsword, this.passsword);
};

userSchems.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchems.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchems);
