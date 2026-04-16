import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { formatDistanceToNow } from "date-fns";
import { Languages, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  usercity: string;
  commentedon: string;
  likedBy?: string[];
  dislikedBy?: string[];
  likes?: number;
  dislikes?: number;
  liked?: boolean;
  disliked?: boolean;
}

const LANGUAGE_OPTIONS = [
  { label: "English", value: "en" },
  { label: "Hindi", value: "hi" },
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Arabic", value: "ar" },
  { label: "Chinese", value: "zh-cn" },
];

const Comments = ({ videoId }: { videoId: string | string[] | undefined }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentCity, setCommentCity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(true);
  const [languageByComment, setLanguageByComment] = useState<
    Record<string, string>
  >({});
  const [translatedComments, setTranslatedComments] = useState<
    Record<string, string>
  >({});
  const [translatingCommentId, setTranslatingCommentId] = useState<string | null>(
    null
  );
  const { user } = useUser();

  const normalizeComment = (rawComment: Comment): Comment => {
    const likedBy = rawComment.likedBy || [];
    const dislikedBy = rawComment.dislikedBy || [];

    return {
      ...rawComment,
      likes: likedBy.length,
      dislikes: dislikedBy.length,
      liked: Boolean(user?._id && likedBy.some((id) => String(id) === user._id)),
      disliked: Boolean(
        user?._id && dislikedBy.some((id) => String(id) === user._id)
      ),
      usercity: rawComment.usercity || "Unknown City",
    };
  };

  const loadComments = async () => {
    if (!videoId || typeof videoId !== "string") {
      return;
    }

    setLoading(true);
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments((res.data || []).map((item: Comment) => normalizeComment(item)));
    } catch (error) {
      console.log(error);
      toast.error("Unable to load comments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [videoId, user?._id]);

  if (loading) {
    return <div>Loading comments...</div>;
  }

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    if (!commentCity.trim()) {
      toast.error("Please enter your city name before posting.");
      return;
    }

    if (!videoId || typeof videoId !== "string") {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name,
        usercity: commentCity,
      });

      if (res.data.comment && res.data.data) {
        setComments((prev) => [normalizeComment(res.data.data), ...prev]);
      }

      setNewComment("");
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast.error(error?.response?.data?.message || "Unable to add comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim() || !editingCommentId || !user?._id) return;
    try {
      const res = await axiosInstance.post(`/comment/editcomment/${editingCommentId}`, {
        commentbody: editText,
        userId: user._id,
      });
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText.trim() } : c
          )
        );
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Unable to update comment.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?._id) return;

    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`, {
        data: { userId: user._id },
      });
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.log(error);
      toast.error("Unable to delete comment.");
    }
  };

  const handleReaction = async (
    id: string,
    reactionType: "like" | "dislike"
  ) => {
    if (!user?._id) {
      toast.error("Please sign in to react to comments.");
      return;
    }

    try {
      const res = await axiosInstance.post(`/comment/react/${id}`, {
        userId: user._id,
        reactionType,
      });

      if (res.data.removed) {
        setComments((prev) => prev.filter((comment) => comment._id !== id));
        toast.error("Comment removed automatically after 2 dislikes.");
        return;
      }

      setComments((prev) =>
        prev.map((comment) =>
          comment._id === id
            ? {
                ...comment,
                likes: res.data.likes,
                dislikes: res.data.dislikes,
                liked: res.data.liked,
                disliked: res.data.disliked,
              }
            : comment
        )
      );
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Unable to update reaction.");
    }
  };

  const handleTranslateComment = async (comment: Comment) => {
    const targetLanguage = languageByComment[comment._id] || "en";

    try {
      setTranslatingCommentId(comment._id);
      const res = await axiosInstance.post("/comment/translate", {
        text: comment.commentbody,
        targetLanguage,
      });

      setTranslatedComments((prev) => ({
        ...prev,
        [comment._id]: res.data.translatedText,
      }));
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Unable to translate comment.");
    } finally {
      setTranslatingCommentId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Input
              placeholder="Enter your exact city"
              value={commentCity}
              onChange={(e) => setCommentCity(e.target.value)}
            />
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="flex gap-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src="/placeholder.svg?height=40&width=40" />
                <AvatarFallback>{comment.usercommented?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-sm">{comment.usercommented}</span>
                  <span className="text-xs text-gray-600">{comment.usercity}</span>
                  <span className="text-xs text-gray-600">
                    {formatDistanceToNow(new Date(comment.commentedon))} ago
                  </span>
                </div>

                {editingCommentId === comment._id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={handleUpdateComment}
                        disabled={!editText.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">{comment.commentbody}</p>

                    {translatedComments[comment._id] && (
                      <p className="text-sm text-gray-600 mt-1">
                        Translation: {translatedComments[comment._id]}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-600">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReaction(comment._id, "like")}
                        disabled={!user || user._id === comment.userid}
                      >
                        <ThumbsUp
                          className={`w-4 h-4 mr-1 ${
                            comment.liked ? "fill-black text-black" : ""
                          }`}
                        />
                        {comment.likes || 0}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReaction(comment._id, "dislike")}
                        disabled={!user || user._id === comment.userid}
                      >
                        <ThumbsDown
                          className={`w-4 h-4 mr-1 ${
                            comment.disliked ? "fill-black text-black" : ""
                          }`}
                        />
                        {comment.dislikes || 0}
                      </Button>

                      <select
                        className="h-8 rounded-md border px-2"
                        value={languageByComment[comment._id] || "en"}
                        onChange={(e) =>
                          setLanguageByComment((prev) => ({
                            ...prev,
                            [comment._id]: e.target.value,
                          }))
                        }
                      >
                        {LANGUAGE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTranslateComment(comment)}
                        disabled={translatingCommentId === comment._id}
                      >
                        <Languages className="w-4 h-4 mr-1" />
                        {translatingCommentId === comment._id
                          ? "Translating..."
                          : "Translate"}
                      </Button>

                      {comment.userid === user?._id && (
                        <div className="flex gap-2 text-sm text-gray-500">
                          <button onClick={() => handleEdit(comment)}>Edit</button>
                          <button onClick={() => handleDelete(comment._id)}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
