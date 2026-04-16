import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import axiosInstance from "@/lib/axiosinstance";
const SearchResult = ({ query }: any) => {
  const queryText = useMemo(
    () => (Array.isArray(query) ? query[0] || "" : query || "").trim(),
    [query]
  );
  const [video, setvideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const videos = async () => {
      if (!queryText) {
        setvideos([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await axiosInstance.get("/video/getall");
        const lowerQuery = queryText.toLowerCase();
        const results = (res.data || []).filter(
          (vid: any) =>
            vid.videotitle?.toLowerCase().includes(lowerQuery) ||
            vid.videochanel?.toLowerCase().includes(lowerQuery)
        );
        setvideos(results);
      } catch (error) {
        console.error("Error loading search results:", error);
        setvideos([]);
      } finally {
        setLoading(false);
      }
    };

    videos();
  }, [queryText]);

  if (!queryText) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          Enter a search term to find videos and channels.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div>Loading search results...</div>;
  }

  if (video.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-gray-600">
          Try different keywords or remove search filters
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {video.length > 0 && (
        <div className="space-y-4">
          {video.map((video: any) => (
            <div key={video._id} className="flex gap-4 group">
              <Link href={`/watch/${video._id}`} className="flex-shrink-0">
                <div className="relative w-80 aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <video
                    src={`${process.env.NEXT_PUBLIC_API_URL}/${video?.filepath}`}
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
                    10:24
                  </div>
                </div>
              </Link>

              <div className="flex-1 min-w-0 py-1">
                <Link href={`/watch/${video._id}`}>
                  <h3 className="font-medium text-lg line-clamp-2 group-hover:text-blue-600 mb-2">
                    {video.videotitle}
                  </h3>
                </Link>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <span>{(video.views || 0).toLocaleString()} views</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(video.createdAt))} ago
                  </span>
                </div>

                <Link
                  href={`/channel/${video.uploader}`}
                  className="flex items-center gap-2 mb-2 hover:text-blue-600"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src="/placeholder.svg?height=24&width=24" />
                    <AvatarFallback className="text-xs">
                      {video.videochanel?.[0] || "V"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-600">
                    {video.videochanel}
                  </span>
                </Link>

                <p className="text-sm text-gray-700 line-clamp-2">
                  Uploaded by {video.videochanel}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center py-8">
        <p className="text-gray-600">
          Showing {video.length} results for "{queryText}"
        </p>
      </div>
    </div>
  );
};

export default SearchResult;
