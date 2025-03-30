import React, { useState, useRef, useEffect } from "react";
import { createJSONEditor } from "vanilla-jsoneditor";

const VideoEditor = () => {
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  // Enhanced JSON structure with animation data
  const [jsonData, setJsonData] = useState({
    project: {
      name: "Character Animation Demo",
      duration: 120,
      resolution: "1920x1080",
      fps: 30,
    },
    timeline: {
      clips: [
        { id: 1, start: 0, end: 30, source: "intro.mp4" },
        { id: 2, start: 30, end: 60, source: "main.mp4" },
      ],
    },
    animation: {
      character: {
        type: "boy",
        position: { x: 50, y: 50 },
        scale: 1,
        animations: [
          { time: 0, x: 10, y: 50, scale: 1, rotation: 0 },
          { time: 30, x: 70, y: 50, scale: 1.2, rotation: 0 },
          { time: 60, x: 40, y: 70, scale: 1, rotation: 45 },
          { time: 90, x: 10, y: 50, scale: 1, rotation: 0 },
        ],
      },
    },
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [jsonError, setJsonError] = useState(null);
  const editorContainerRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(Date.now());

  // Initialize the JSONEditor when the component mounts
  useEffect(() => {
    if (editorContainerRef.current && !editorInstanceRef.current) {
      const editor = createJSONEditor({
        target: editorContainerRef.current,
        props: {
          content: { json: jsonData },
          mode: "tree",
          mainMenuBar: true,
          navigationBar: true,
          statusBar: true,
          onChange: (
            content,
            previousContent,
            { contentErrors, patchResult }
          ) => {
            if (contentErrors.length === 0 && content.json) {
              setJsonData(content.json);
              setJsonError(null);
            } else if (contentErrors.length > 0) {
              setJsonError(contentErrors[0].message);
            }
          },
        },
      });

      editorInstanceRef.current = editor;

      // Cleanup function
      return () => {
        if (editorInstanceRef.current) {
          editorInstanceRef.current.destroy();
          editorInstanceRef.current = null;
        }
      };
    }
  }, []);

  // Update the editor when jsonData changes from outside
  useEffect(() => {
    if (editorInstanceRef.current) {
      const currentContent = editorInstanceRef.current.get();

      // Only update if the content is different to avoid recursion
      if (JSON.stringify(currentContent.json) !== JSON.stringify(jsonData)) {
        editorInstanceRef.current.update({ json: jsonData });
      }
    }
  }, [jsonData]);

  // Handle animation playback
  useEffect(() => {
    if (isPlaying) {
      const updateAnimation = () => {
        const now = Date.now();
        const deltaTime = (now - lastUpdateTimeRef.current) / 1000;
        lastUpdateTimeRef.current = now;

        setCurrentTime((prevTime) => {
          const newTime = prevTime + deltaTime;
          return newTime >= jsonData.project.duration ? 0 : newTime;
        });

        animationFrameRef.current = requestAnimationFrame(updateAnimation);
      };

      animationFrameRef.current = requestAnimationFrame(updateAnimation);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isPlaying, jsonData.project.duration]);

  // Calculate character position and properties based on current time
  const getCharacterProps = () => {
    const { animations } = jsonData.animation.character;

    // Find the animation keyframes before and after current time
    let beforeIndex = -1;
    let afterIndex = -1;

    for (let i = 0; i < animations.length; i++) {
      if (animations[i].time <= currentTime) {
        beforeIndex = i;
      }
      if (animations[i].time >= currentTime && afterIndex === -1) {
        afterIndex = i;
      }
    }

    // Handle edge cases
    if (beforeIndex === -1) beforeIndex = 0;
    if (afterIndex === -1) afterIndex = animations.length - 1;

    // If at exact keyframe, return those values
    if (animations[beforeIndex].time === currentTime) {
      return animations[beforeIndex];
    }

    // If between keyframes, interpolate
    const before = animations[beforeIndex];
    const after = animations[afterIndex];

    // If same keyframe or no valid interpolation
    if (beforeIndex === afterIndex) {
      return before;
    }

    // Calculate interpolation factor
    const timeDiff = after.time - before.time;
    const factor = timeDiff === 0 ? 0 : (currentTime - before.time) / timeDiff;

    // Interpolate values
    return {
      x: before.x + (after.x - before.x) * factor,
      y: before.y + (after.y - before.y) * factor,
      scale: before.scale + (after.scale - before.scale) * factor,
      rotation: before.rotation + (after.rotation - before.rotation) * factor,
    };
  };

  // Apply JSON changes (needed if auto-apply is disabled)
  const applyJsonChanges = () => {
    if (editorInstanceRef.current) {
      try {
        const content = editorInstanceRef.current.get();
        if (content.json) {
          setJsonData(content.json);
          setJsonError(null);
        }
      } catch (error) {
        setJsonError("Invalid JSON: " + error.message);
      }
    }
  };

  // Get character properties
  const characterProps = getCharacterProps();

  const onToggleButtonClick = () => {
    setIsPreviewVisible((prev) => !prev);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="sm:text-sm md:text-xl font-bold">
            Video Editor with Character Animation
          </h1>
          <div className="space-x-4 flex">
            <button className="px-4 py-2 bg-blue-700 rounded hover:bg-blue-800">
              Save
            </button>
            <button className="px-4 py-2 bg-blue-700 rounded hover:bg-blue-800">
              Export
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* JSON Panel (Left Side) */}
        <div
          className={
            (isPreviewVisible ? "w-10" : "sm:w-full") +
            " md:w-1/3 bg-gray-800 text-white flex flex-col"
          }
        >
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Animation JSON</h2>
            <button
              className="px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-sm"
              onClick={applyJsonChanges}
            >
              Apply Changes
            </button>
          </div>

          {/* JSON Editor Container */}
          <div
            className={
              (isPreviewVisible ? "hidden " : "") +
              "flex-1 bg-white overflow-scroll"
            }
            ref={editorContainerRef}
          ></div>

          {/* Error Display */}
          {jsonError && (
            <div className="p-3 bg-red-800 text-white text-sm">{jsonError}</div>
          )}
        </div>

        {/* Video Display (Middle) */}
        <div className="flex-1 flex flex-col bg-gray-900">
          {/* Toggle Button */}
          <div
            className="h-10 w-8 bg-blue-500 flex items-center justify-center rounded-l -translate-x-8 translate-y-48 md:hidden"
            onClick={onToggleButtonClick}
          >
            <span className="text-white">{isPreviewVisible ? ">" : "<"}</span>
          </div>
          {/* Video Preview */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="relative w-full max-w-3xl aspect-video bg-black rounded shadow-lg overflow-hidden">
              {/* Animation canvas */}
              <div className="absolute inset-0">
                {/* Boy character */}
                <div
                  className="absolute"
                  style={{
                    left: `${characterProps.x}%`,
                    top: `${characterProps.y}%`,
                    transform: `translate(-50%, -50%) scale(${characterProps.scale}) rotate(${characterProps.rotation}deg)`,
                    transition: isPlaying ? "none" : "all 0.3s ease-out",
                  }}
                >
                  {/* Simple boy character */}
                  <div className="relative transform scale-50">
                    {/* Head */}
                    <div className="w-20 h-20 rounded-full bg-yellow-200 relative">
                      {/* Eyes */}
                      <div
                        className="absolute w-3 h-3 bg-gray-800 rounded-full"
                        style={{ left: "30%", top: "40%" }}
                      ></div>
                      <div
                        className="absolute w-3 h-3 bg-gray-800 rounded-full"
                        style={{ left: "70%", top: "40%" }}
                      ></div>
                      {/* Mouth */}
                      <div
                        className="absolute w-8 h-2 bg-red-500 rounded-full"
                        style={{ left: "30%", top: "70%" }}
                      ></div>
                    </div>
                    {/* Body */}
                    <div className="w-24 h-28 bg-blue-500 -mt-2 rounded-t-lg">
                      {/* Arms */}
                      <div className="absolute w-8 h-20 bg-blue-500 rounded-full -left-4 top-8"></div>
                      <div className="absolute w-8 h-20 bg-blue-500 rounded-full -right-4 top-8"></div>
                    </div>
                    {/* Legs */}
                    <div className="flex justify-between -mt-2">
                      <div className="w-8 h-20 bg-gray-700 rounded-b-lg"></div>
                      <div className="w-8 h-20 bg-gray-700 rounded-b-lg"></div>
                    </div>
                  </div>
                </div>

                {/* Background grid for reference */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(100,100,100,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,100,100,0.1) 1px, transparent 1px)",
                    backgroundSize: "10% 10%",
                  }}
                ></div>

                {/* Current time indicator */}
                <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                  Time: {currentTime.toFixed(1)}s
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="h-32 bg-gray-800 p-4">
            <div className="h-full bg-gray-700 rounded relative">
              {/* Timeline markers */}
              <div className="absolute top-0 left-0 right-0 h-6 flex text-xs text-gray-400">
                {Array.from(
                  { length: Math.ceil(jsonData.project.duration / 30) + 1 },
                  (_, i) => i * 30
                ).map((time) => (
                  <div
                    key={time}
                    className="flex-1 border-l border-gray-600 pl-1"
                  >
                    {time}s
                  </div>
                ))}
              </div>

              {/* Animation keyframes */}
              <div className="absolute top-12 h-8 left-0 right-0 z-10">
                {jsonData.animation.character.animations.map(
                  (keyframe, index) => {
                    const left =
                      (keyframe.time / jsonData.project.duration) * 100;

                    return (
                      <div
                        key={index}
                        className="absolute w-4 h-4 bg-yellow-400 rounded-full border-2 border-yellow-600 -ml-2 cursor-pointer"
                        style={{ left: `${left}%` }}
                        title={`Keyframe at ${keyframe.time}s (x:${keyframe.x}, y:${keyframe.y})`}
                      ></div>
                    );
                  }
                )}
              </div>

              {/* Clips */}
              <div className="absolute top-8 left-0 right-0 bottom-0 p-2">
                {jsonData.timeline.clips &&
                  jsonData.timeline.clips.map((clip, index) => {
                    const width =
                      ((clip.end - clip.start) / jsonData.project.duration) *
                      100;
                    const left = (clip.start / jsonData.project.duration) * 100;

                    return (
                      <div
                        key={clip.id}
                        className="absolute h-12 rounded bg-blue-500 opacity-80 hover:opacity-100 cursor-pointer"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          top: `${index * 16}px`,
                        }}
                      >
                        <div className="px-2 text-xs text-white truncate">
                          {clip.source}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-px bg-red-500 z-10"
                style={{
                  left: `${(currentTime / jsonData.project.duration) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-700 text-gray-300 p-3">
        <div className="container mx-auto flex justify-between items-center flex-col sm:flex-col md:flex-row gap-2">
          <div className="text-sm">
            Current Time: {currentTime.toFixed(1)}s | Position: (
            {characterProps.x.toFixed(1)}%, {characterProps.y.toFixed(1)}%) |
            Scale: {characterProps.scale.toFixed(2)} | Rotation:{" "}
            {characterProps.rotation.toFixed(0)}°
          </div>
          <div className="flex space-x-4">
            <button
              className="text-white hover:text-blue-300"
              onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
            >
              &laquo; 10s
            </button>
            <button
              className={`px-4 py-1 rounded ${
                isPlaying
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              className="text-white hover:text-blue-300"
              onClick={() => setCurrentTime(0)}
            >
              Reset
            </button>
            <button
              className="text-white hover:text-blue-300"
              onClick={() =>
                setCurrentTime(
                  Math.min(jsonData.project.duration, currentTime + 10)
                )
              }
            >
              10s &raquo;
            </button>
          </div>
          <div className="text-sm">
            Total Duration: {jsonData.project.duration}s
          </div>
        </div>
      </footer>
    </div>
  );
};

export default VideoEditor;
