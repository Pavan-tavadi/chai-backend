import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const videoSchems = new mongoose.Schema(
  {
    videoFile: { type: String, required: true },
    thumbnail: {
      type: String, //cloudnary url
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, //cloudnary url
      required: true,
    },
    views: {
      type: Number, //cloudnary url
      default: 0,
    },
    isPublished: {
      type: Boolean, //cloudnary url
      default: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId, //cloudnary url
      ref: "User",
    },
  },
  { timestamps: true }
);
videoSchems.plugin(mongooseAggregatePaginate);
export const Video = mongoose.model("Video", videoSchems);
