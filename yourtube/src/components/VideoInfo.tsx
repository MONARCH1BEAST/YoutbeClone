import React, { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const trackedViewRef = useRef("");

  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  useEffect(() => {
    const handleviews = async () => {
      if (!video?._id) return;

      const trackingKey = `${user?._id || "guest"}:${video._id}`;
      if (trackedViewRef.current === trackingKey) return;
      trackedViewRef.current = trackingKey;

      if (user?._id) {
        try {
          await axiosInstance.post(`/history/${video._id}`, {
            userId: user._id,
          });
        } catch (error) {
          console.log(error);
        }
      } else {
        await axiosInstance.post(`/history/views/${video._id}`);
      }
    };

    handleviews();
  }, [user?._id, video?._id]);

  const handleLike = async () => {
    if (!user?._id) {
      toast.error("Please sign in to like videos.");
      return;
    }

    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user._id,
      });
      if (res.data.liked) {
        setlikes((prev: any) => prev + 1);
        setIsLiked(true);
        if (isDisliked) {
          setDislikes((prev: any) => Math.max(0, prev - 1));
          setIsDisliked(false);
        }
      } else {
        setlikes((prev: any) => Math.max(0, prev - 1));
        setIsLiked(false);
      }
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Unable to update like.");
    }
  };
  const handleWatchLater = async () => {
    if (!user?._id) {
      toast.error("Please sign in to save videos.");
      return;
    }

    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(true);
      } else {
        setIsWatchLater(false);
      }
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Unable to update Watch later.");
    }
  };
  const handleDislike = async () => {
    if (!user?._id) {
      toast.error("Please sign in to dislike videos.");
      return;
    }

    try {
      const res = await axiosInstance.post(`/like/dislike/${video._id}`, {
        userId: user._id,
      });
      if (res.data.disliked) {
        setDislikes((prev: any) => prev + 1);
        setIsDisliked(true);
        if (isLiked || res.data.removedLike) {
          setlikes((prev: any) => Math.max(0, prev - 1));
          setIsLiked(false);
        }
      } else {
        setDislikes((prev: any) => Math.max(0, prev - 1));
        setIsDisliked(false);
      }
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Unable to update dislike.");
    }
  };

  const handleDownload = async () => {
    if (!user?._id) {
      toast.error("Please sign in to download videos.");
      return;
    }

    try {
      const res = await axiosInstance.post(`/download/request/${video._id}`, {
        userId: user._id,
      });

      const backendUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!backendUrl || !res.data.downloadId) {
        toast.error("Download URL is unavailable.");
        return;
      }

      const link = document.createElement("a");
      link.href = `${backendUrl}/download/file/${res.data.downloadId}?userId=${user._id}`;
      link.setAttribute("download", video?.filename || "video.mp4");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(
        res.data?.alreadyDownloaded
          ? "This video is already in Downloads. Download started."
          : "Download started."
      );
    } catch (error: any) {
      const errorCode = error?.response?.data?.code;

      if (errorCode === "DAILY_LIMIT_EXCEEDED") {
        toast.error(
          "Free users can download only one video per day. Upgrade to Premium for unlimited downloads."
        );
        return;
      }

      toast.error(error?.response?.data?.message || "Unable to download video.");
    }
  };
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{video.videochanel[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{video.videochanel}</h3>
            <p className="text-sm text-gray-600">1.2M subscribers</p>
          </div>
          <Button className="ml-4">Subscribe</Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-2 ${
                  isLiked ? "fill-black text-black" : ""
                }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-gray-300" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 mr-2 ${
                  isDisliked ? "fill-black text-black" : ""
                }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 rounded-full ${
              isWatchLater ? "text-primary" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full"
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full"
            onClick={handleDownload}
          >
            <Download className="w-5 h-5 mr-2" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-gray-100 rounded-full"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
    </div>
  );
};

export default VideoInfo;
