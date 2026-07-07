import { useState } from "react";
import socket from "../socket";
import { extractYouTubeId } from "../utils/youtube";

function ChangeVideoInput() {
  const [url, setUrl] = useState("");

  const handleChangeVideo = () => {
    const videoId = extractYouTubeId(url.trim());
    if (!videoId) {
      alert("Couldn't find a valid YouTube video ID in that URL.");
      return;
    }
    socket.emit("change_video", { videoId });
    setUrl("");
  };

  return (
    <div className="change-video-row">
      <input
        placeholder="Paste a YouTube URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleChangeVideo()}
      />
      <button onClick={handleChangeVideo}>Change Video</button>
    </div>
  );
}

export default ChangeVideoInput;
