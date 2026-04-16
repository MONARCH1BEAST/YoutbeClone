import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();
  const [channel, setChannel] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const channelId = Array.isArray(id) ? id[0] : id;
  const isOwnChannel = Boolean(user?._id && user._id === channelId);

  const loadChannelVideos = async () => {
    if (!channelId) return;

    const videosResponse = await axiosInstance.get("/video/getall");
    setVideos(
      (videosResponse.data || []).filter(
        (video: any) => String(video.uploader) === String(channelId)
      )
    );
  };

  useEffect(() => {
    const loadChannel = async () => {
      if (!channelId) return;

      setLoading(true);
      try {
        const channelResponse = isOwnChannel
          ? { data: user }
          : await axiosInstance.get(`/user/${channelId}`);

        setChannel(channelResponse.data);
        await loadChannelVideos();
      } catch (error) {
        console.error("Error fetching channel data:", error);
        setChannel(null);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    loadChannel();
  }, [channelId, isOwnChannel, user?._id, user?.channelname]);

  if (loading) {
    return <div className="flex-1 p-6">Loading channel...</div>;
  }

  if (!channel) {
    return <div className="flex-1 p-6">Channel not found</div>;
  }

  return (
    <div className="flex-1 min-h-screen bg-white">
      <div className="max-w-full mx-auto">
        <ChannelHeader channel={channel} user={user} />
        <Channeltabs />
        {isOwnChannel && channel?.channelname && (
          <div className="px-4 pb-8">
            <VideoUploader
              channelId={channelId}
              channelName={channel.channelname}
              onUploadComplete={loadChannelVideos}
            />
          </div>
        )}
        <div className="px-4 pb-8">
          <ChannelVideos videos={videos} />
        </div>
      </div>
    </div>
  );
};

export default index;
