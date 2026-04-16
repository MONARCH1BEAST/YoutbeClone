"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Crown, Download, DownloadCloud, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import PremiumUpgradeButton from "@/components/PremiumUpgradeButton";

type DownloadStatus = {
  isPremium: boolean;
  downloadsToday: number | null;
  freeDailyLimit: number;
  remainingDownloads: number | null;
};

const normalizeMediaPath = (rawPath = "") => rawPath.replace(/\\/g, "/");

export default function DownloadsContent() {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  const activeDownloads = useMemo(
    () => downloads.filter((item) => item?.videoid),
    [downloads]
  );

  const loadDownloads = async () => {
    if (!user?._id) return;

    try {
      const response = await axiosInstance.get(`/download/${user._id}`);
      setDownloads(response.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load downloads.");
    }
  };

  const loadDownloadStatus = async () => {
    if (!user?._id) return;

    try {
      const response = await axiosInstance.get(`/download/status/${user._id}`);
      setDownloadStatus(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load download limits.");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      await Promise.all([loadDownloads(), loadDownloadStatus()]);
      setLoading(false);
    };

    fetchData();
  }, [user?._id]);

  const triggerFileDownload = (downloadId: string) => {
    const backendUrl = process.env.BACKEND_URL;

    if (!backendUrl) {
      toast.error("Backend URL is unavailable.");
      return;
    }

    const link = document.createElement("a");
    link.href = `${backendUrl}/download/file/${downloadId}?userId=${user._id}`;
    link.setAttribute("download", "video.mp4");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <DownloadCloud className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access your downloads</h2>
        <p className="text-gray-600">
          Sign in to view downloaded videos and upgrade to premium.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div>Loading downloads...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 bg-gray-50">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Crown className="w-5 h-5" />
              {user?.isPremium ? "Premium Plan" : "Free Plan"}
            </h2>
            {user?.isPremium ? (
              <p className="text-sm text-gray-600 mt-1">
                Unlimited daily downloads enabled.
              </p>
            ) : (
              <p className="text-sm text-gray-600 mt-1">
                Free users can download 1 video per day.
                {typeof downloadStatus?.remainingDownloads === "number"
                  ? ` Remaining today: ${downloadStatus.remainingDownloads}`
                  : ""}
              </p>
            )}
          </div>

          {!user?.isPremium && (
            <PremiumUpgradeButton
              onSuccess={async () => {
                await Promise.all([loadDownloads(), loadDownloadStatus()]);
              }}
            />
          )}
        </div>
      </div>

      {activeDownloads.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Film className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No downloads yet</h2>
          <p className="text-gray-600">
            Downloaded videos will appear in this section.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{activeDownloads.length} videos</p>
          {activeDownloads.map((item) => (
            <div key={item._id} className="flex gap-4 group">
              <Link href={`/watch/${item.videoid._id}`} className="flex-shrink-0">
                <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden">
                  <video
                    src={`${process.env.BACKEND_URL}/${normalizeMediaPath(
                      item.videoid?.filepath || ""
                    )}`}
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={`/watch/${item.videoid._id}`}>
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
                    {item.videoid.videotitle}
                  </h3>
                </Link>
                <p className="text-sm text-gray-600">{item.videoid.videochanel}</p>
                <p className="text-sm text-gray-600">
                  Downloaded {formatDistanceToNow(new Date(item.downloadedon))} ago
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => triggerFileDownload(item._id)}
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
