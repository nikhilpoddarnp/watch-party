import { useEffect, useRef, useState } from "react";
import socket from "../socket";

function VideoPlayer({ videoState, canControl }) {
  const playerRef = useRef(null);
  const playerInstance = useRef(null);
  const isRemoteUpdate = useRef(false);
  const hasCreatedPlayer = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (hasCreatedPlayer.current) return;
    if (!videoState.videoId) return;

    function createPlayer() {
      playerInstance.current = new window.YT.Player(playerRef.current, {
        height: "100%",
        width: "100%",
        videoId: videoState.videoId,
        playerVars: {
          start: Math.floor(videoState.currentTime),
          controls: 0,
          disablekb: 1,
        },
        events: {
          onReady: () => {
            hasCreatedPlayer.current = true;
            if (videoState.playState === "playing") {
              isRemoteUpdate.current = true;
              playerInstance.current.playVideo();
            }
          },
          onStateChange: handlePlayerStateChange,
        },
      });
    }

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = createPlayer;
    }
  }, [videoState.videoId]);

  function handlePlayerStateChange(event) {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    if (!canControl) return;

    const currentTime = playerInstance.current.getCurrentTime();
    if (event.data === window.YT.PlayerState.PLAYING) {
      socket.emit("play", { currentTime });
    } else if (event.data === window.YT.PlayerState.PAUSED) {
      socket.emit("pause", { currentTime });
    }
  }

  useEffect(() => {
    const player = playerInstance.current;
    if (!player || !player.getPlayerState || !hasCreatedPlayer.current) return;

    if (videoState.videoId && player.getVideoData()?.video_id !== videoState.videoId) {
      isRemoteUpdate.current = true;
      player.loadVideoById(videoState.videoId, videoState.currentTime);
    }

    const current = player.getCurrentTime();
    if (Math.abs(current - videoState.currentTime) > 1.5) {
      player.seekTo(videoState.currentTime, true);
    }

    const playerState = player.getPlayerState();
    const isCurrentlyPlaying = playerState === window.YT.PlayerState.PLAYING;
    const shouldBePlaying = videoState.playState === "playing";

    if (shouldBePlaying && !isCurrentlyPlaying) {
      isRemoteUpdate.current = true;
      player.playVideo();
    } else if (!shouldBePlaying && isCurrentlyPlaying) {
      isRemoteUpdate.current = true;
      player.pauseVideo();
    }
  }, [videoState]);

  useEffect(() => {
    const interval = setInterval(() => {
      const player = playerInstance.current;
      if (player && player.getCurrentTime) {
        setCurrentTime(player.getCurrentTime());
        setDuration(player.getDuration());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSeek = (e) => {
    const newTime = Number(e.target.value);
    isRemoteUpdate.current = false;
    playerInstance.current.seekTo(newTime, true);
    setCurrentTime(newTime);
    socket.emit("seek", { time: newTime });
  };

  const handlePlayClick = () => {
    isRemoteUpdate.current = false;
    playerInstance.current.playVideo();
  };

  const handlePauseClick = () => {
    isRemoteUpdate.current = false;
    playerInstance.current.pauseVideo();
  };

  const handleFullscreen = () => {
    const player = playerInstance.current;
    if (!player || !player.getIframe) return;
    const iframe = player.getIframe();
    if (iframe.requestFullscreen) {
      iframe.requestFullscreen();
    } else if (iframe.webkitRequestFullscreen) {
      iframe.webkitRequestFullscreen(); // Safari
    } else if (iframe.msRequestFullscreen) {
      iframe.msRequestFullscreen(); // old Edge/IE
    }
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <div>
      <div className="player-frame">
        <div ref={playerRef}></div>
      </div>

      {canControl && (
        <div className="custom-controls">
          <button className="control-btn" onClick={handlePlayClick} aria-label="Play">▶</button>
          <button className="control-btn" onClick={handlePauseClick} aria-label="Pause">⏸</button>
          <input
            type="range"
            className="seek-bar"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
          />
          <span className="time-label">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <button className="control-btn fullscreen-btn" onClick={handleFullscreen} aria-label="Fullscreen">
            ⛶
          </button>
        </div>
      )}
      {!canControl && (
        <div className="custom-controls">
          <button className="control-btn fullscreen-btn" onClick={handleFullscreen} aria-label="Fullscreen">
            ⛶
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;