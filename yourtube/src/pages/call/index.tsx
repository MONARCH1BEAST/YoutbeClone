"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

const STUN_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

type CallRole = "caller" | "callee";

type CallStatus =
  | "idle"
  | "waiting"
  | "connecting"
  | "connected"
  | "ended"
  | "error";

export default function CallPage() {
  const router = useRouter();
  const { user } = useUser();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const roomIdRef = useRef<string>("");
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pollingRef = useRef<number | null>(null);
  const answerPollingRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const roleRef = useRef<CallRole | null>(null);

  const [roomId, setRoomId] = useState<string>("");
  const [joinRoomId, setJoinRoomId] = useState<string>("");
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [roomLink, setRoomLink] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [localStreamRef.current]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }, [remoteStreamRef.current]);

  useEffect(() => {
    if (screenVideoRef.current && screenStreamRef.current) {
      screenVideoRef.current.srcObject = screenStreamRef.current;
    }
  }, [screenStreamRef.current]);

  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, []);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

    pc.onicecandidate = async (event) => {
      if (!event.candidate || !roomIdRef.current || !roleRef.current) return;
      await axiosInstance.post("/call/candidate", {
        roomId: roomIdRef.current,
        candidate: event.candidate,
        role: roleRef.current,
      });
    };

    pc.ontrack = (event) => {
      let remote = remoteStreamRef.current;
      if (!remote) {
        remote = new MediaStream();
        remoteStreamRef.current = remote;
        setRemoteStream(remote);
      }
      if (event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (!remote!.getTrackById(track.id)) {
            remote!.addTrack(track);
          }
        });
      } else {
        if (!remote.getTrackById(event.track.id)) {
          remote.addTrack(event.track);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallStatus("connected");
      } else if (pc.connectionState === "disconnected") {
        setCallStatus("ended");
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const cleanupCall = () => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (answerPollingRef.current) {
      window.clearInterval(answerPollingRef.current);
      answerPollingRef.current = null;
    }
    if (recorderRef.current && recording) {
      recorderRef.current.stop();
    }
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    screenStreamRef.current = null;
    setRoomId("");
    setRoomLink("");
    setCallStatus("ended");
    roleRef.current = null;
  };

  const setLocalStream = (stream: MediaStream) => {
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  };

  const setRemoteStream = (stream: MediaStream) => {
    if (!remoteStreamRef.current) {
      remoteStreamRef.current = stream;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }
  };

  const getLocalMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(stream);
    return stream;
  };

  const attachLocalTracks = (stream: MediaStream) => {
    const pc = pcRef.current;
    if (!pc) return;
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });
  };

  const startCandidatePolling = (role: CallRole) => {
    if (pollingRef.current) return;
    pollingRef.current = window.setInterval(async () => {
      if (!roomId) return;
      try {
        const response = await axiosInstance.get(
          `/call/candidates/${roomId}?for=${role}`
        );
        const candidates = response.data.candidates || [];
        for (const candidate of candidates) {
          try {
            await pcRef.current?.addIceCandidate(candidate);
          } catch (err) {
            console.warn("candidate add failed", err);
          }
        }
      } catch (err) {
        console.warn(err);
      }
    }, 1000);
  };

  const startAnswerPolling = () => {
    if (answerPollingRef.current) return;
    answerPollingRef.current = window.setInterval(async () => {
      if (!roomId) return;
      try {
        const response = await axiosInstance.get(`/call/answer/${roomId}`);
        const answer = response.data.answer;
        if (answer && pcRef.current?.signalingState === "have-local-offer") {
          await pcRef.current.setRemoteDescription(answer);
          setCallStatus("connected");
          if (answerPollingRef.current) {
            window.clearInterval(answerPollingRef.current);
            answerPollingRef.current = null;
          }
        }
      } catch (err) {
        // ignore until answer arrives
      }
    }, 1500);
  };

  const handleCreateRoom = async () => {
    setError("");
    try {
      const vStream = await getLocalMedia();
      const pc = createPeerConnection();
      attachLocalTracks(vStream);
      const roomResponse = await axiosInstance.post("/call/create");
      const room = roomResponse.data.roomId;
      roomIdRef.current = room;
      setRoomId(room);
      setRoomLink(`${window.location.origin}/call?room=${room}`);
      roleRef.current = "caller";
      setCallStatus("waiting");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await axiosInstance.post("/call/offer", { roomId: room, offer });
      startCandidatePolling("caller");
      startAnswerPolling();
    } catch (err) {
      setError("Unable to start call. Please allow camera and microphone access.");
      setCallStatus("error");
    }
  };

  const handleJoinRoom = async () => {
    if (!joinRoomId.trim()) {
      setError("Enter a room id to join.");
      return;
    }
    setError("");
    try {
      const offerResponse = await axiosInstance.get(`/call/offer/${joinRoomId.trim()}`);
      const offer = offerResponse.data.offer;
      const vStream = await getLocalMedia();
      const pc = createPeerConnection();
      attachLocalTracks(vStream);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await axiosInstance.post("/call/answer", {
        roomId: joinRoomId.trim(),
        answer,
      });
      roomIdRef.current = joinRoomId.trim();
      setRoomId(joinRoomId.trim());
      setRoomLink(`${window.location.origin}/call?room=${joinRoomId.trim()}`);
      roleRef.current = "callee";
      setCallStatus("connecting");
      startCandidatePolling("callee");
    } catch (err) {
      setError("Unable to join the call. Verify the room id and try again.");
      setCallStatus("error");
    }
  };

  const handleStartScreenShare = async () => {
    if (!pcRef.current) {
      setError("Start or join a call first.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      screenStreamRef.current = stream;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach((track) => {
        const sender = pcRef.current!.addTrack(track, stream);
        track.onended = () => {
          if (sender) {
            pcRef.current?.removeTrack(sender);
          }
          screenStreamRef.current = null;
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = null;
          }
        };
      });
    } catch (err) {
      setError("Screen share failed. Please select a window or tab to share.");
    }
  };

  const handleStartRecording = () => {
    if (!localStreamRef.current || !remoteStreamRef.current) {
      setError("A live call is required to record.");
      return;
    }
    const combined = new MediaStream([
      ...localStreamRef.current.getTracks(),
      ...remoteStreamRef.current.getTracks(),
      ...(screenStreamRef.current ? screenStreamRef.current.getTracks() : []),
    ]);
    try {
      const recorder = new MediaRecorder(combined, { mimeType: "video/webm" });
      recordedChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);
        setRecording(false);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setError("");
    } catch (err) {
      setError("Recording is not supported in this browser.");
    }
  };

  const handleStopRecording = () => {
    if (!recorderRef.current) return;
    recorderRef.current.stop();
    recorderRef.current = null;
  };

  const handleDownloadRecording = () => {
    if (!recordingUrl) return;
    const anchor = document.createElement("a");
    anchor.href = recordingUrl;
    anchor.download = `call-recording-${new Date().toISOString()}.webm`;
    anchor.click();
  };

  const handleLeaveCall = () => {
    cleanupCall();
  };

  const instructions = useMemo(
    () => [
      "Create a room and share the room ID with your friend.",
      "Join using the room ID on another device.",
      "Use screen share to share YouTube or any website tab.",
      "Record the session and save the file locally.",
    ],
    []
  );

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Video Call Room</h1>
            <p className="text-sm text-gray-600 max-w-2xl">
              Start a secure WebRTC call, share your screen with a YouTube tab, and record the session locally.
            </p>
          </div>
          {user ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">
              Signed in as {user.name || user.email}
            </span>
          ) : (
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-800">
              Sign in to start a call
            </span>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr,0.7fr]">
          <div className="space-y-6 rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Button onClick={handleCreateRoom} disabled={!user || callStatus === "waiting" || callStatus === "connecting" || callStatus === "connected"}>
                  Create call room
                </Button>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Join room</label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-lg border px-3 py-2"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value)}
                      placeholder="Enter room ID"
                    />
                    <Button onClick={handleJoinRoom} disabled={!user || callStatus === "waiting" || callStatus === "connecting" || callStatus === "connected"}>
                      Join
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button onClick={handleStartScreenShare} disabled={!roomId || callStatus !== "connected"}>
                  Share YouTube Screen
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {!recording ? (
                  <Button onClick={handleStartRecording} disabled={callStatus !== "connected"}>
                    Start recording
                  </Button>
                ) : (
                  <Button onClick={handleStopRecording} variant="destructive">
                    Stop recording
                  </Button>
                )}
                <Button onClick={handleDownloadRecording} disabled={!recordingUrl} variant="secondary">
                  Download recording
                </Button>
                <Button onClick={handleLeaveCall} variant="destructive">
                  Leave call
                </Button>
              </div>
              {roomId && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-medium">Room ID</div>
                  <div className="break-all">{roomId}</div>
                  <div className="mt-2">Share this link with your friend:</div>
                  <div className="break-all text-blue-700">{roomLink}</div>
                </div>
              )}
              {error && <div className="rounded-xl bg-red-100 p-3 text-sm text-red-800">{error}</div>}
              <div className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                {instructions.map((instruction) => (
                  <p key={instruction}>• {instruction}</p>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-black/5 p-4">
                <h2 className="text-sm font-medium">Your camera</h2>
                <video
                  ref={localVideoRef}
                  className="mt-3 h-64 w-full rounded-lg bg-black object-cover"
                  autoPlay
                  muted
                  playsInline
                />
              </div>
              <div className="rounded-xl border border-gray-200 bg-black/5 p-4">
                <h2 className="text-sm font-medium">Friend video</h2>
                <video
                  ref={remoteVideoRef}
                  className="mt-3 h-64 w-full rounded-lg bg-black object-cover"
                  autoPlay
                  playsInline
                />
              </div>
            </div>
            {screenStreamRef.current && (
              <div className="rounded-xl border border-gray-200 bg-black/5 p-4">
                <h2 className="text-sm font-medium">Screen sharing</h2>
                <video
                  ref={screenVideoRef}
                  className="mt-3 h-64 w-full rounded-lg bg-black object-cover"
                  autoPlay
                  playsInline
                />
              </div>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-slate-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Call status</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>
                <span className="font-medium">Current state:</span> {callStatus}
              </p>
              <p>
                <span className="font-medium">Room link:</span>{" "}
                {roomLink || "Create or join a room to generate a link."}
              </p>
              <p>
                <span className="font-medium">Recording:</span> {recording ? "Recording live" : recordingUrl ? "Ready to download" : "Inactive"}
              </p>
              <p className="text-xs text-slate-500">
                Note: Screen sharing requires a browser-supported display capture prompt and may need HTTPS/localhost.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
