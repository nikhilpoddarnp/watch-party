import { useEffect, useRef } from "react";
import socket from "../socket";

function VideoPlayer({ videoState, canControl }) {
  const playerRef = useRef(null);
  const playerInstance = useRef(null);
  const isRemoteUpdate = useRef(false);
  const hasCreatedPlayer = useRef(false);
  useEffect(() => {
    if (hasCreatedPlayer.current) return;
    if (!videoState.videoId) return;

    function createPlayer() {
      playerInstance.current = new window.YT.Player(playerRef.current, {
        height: "390",
        width: "640",
        videoId: videoState.videoId,
        playerVars: {
          start: Math.floor(videoState.currentTime),
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
      hasCreatedPlayer.current = true;
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
  const handlePlayClick = () => {
    isRemoteUpdate.current = false; 
    playerInstance.current.playVideo();
  };

  const handlePauseClick = () => {
    isRemoteUpdate.current = false;
    playerInstance.current.pauseVideo();
  };

  return (
    <div>
      <div ref={playerRef}></div>
      {canControl && (
        <div style={{ marginTop: "0.5rem" }}>
          <button onClick={handlePlayClick}>▶ Play</button>
          <button onClick={handlePauseClick}>⏸ Pause</button>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;