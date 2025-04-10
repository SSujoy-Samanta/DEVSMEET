import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
import rough from "roughjs";
import { Socket } from "socket.io-client";
import { motion } from "framer-motion";

const generator = rough.generator();

interface Element {
  offsetX: number;
  offsetY: number;
  width?: number;
  height?: number;
  radius?: number; // For circle and ellipse
  path?: [number, number][]; // For pencil tool
  text?: string; // For text tool
  element: string;
  stroke: string;
  strokeWidth?: number;
}

interface CanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  ctxRef: React.RefObject<CanvasRenderingContext2D | null>;
  color: string;
  setElements: React.Dispatch<React.SetStateAction<Element[]>>;
  elements: Element[];
  tool: string;
  socket: Socket | undefined;
  roomName:string
}

export const BoardCanvas: React.FC<CanvasProps> = ({
  canvasRef,
  ctxRef,
  color,
  setElements,
  elements,
  tool,
  socket,
  roomName
}) => {
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [img, setImg] = useState<string>();
  const [strokeWidth, setStrokeWidth] = useState<number>(5);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Socket connection for collaborative drawing
  useEffect(() => {
    socket?.on("drawingresponse", ({ canvasImage }) => {
      setImg(canvasImage);
    });

    return () => {
      socket?.off("drawingresponse");
    };
  }, [socket]);

  // Canvas initialization with responsive sizing
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Set canvas dimensions based on container size
      canvas.width = containerWidth * 2; // For high DPI
      canvas.height = containerHeight * 2;
      canvas.style.width = `${containerWidth}px`;
      canvas.style.height = `${containerHeight}px`;

      const context = canvas.getContext("2d");
      if (!context) return;

      // Set up drawing styles
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = color;
      context.lineWidth = strokeWidth;
      context.scale(2, 2); // Scale for high DPI displays

      //@ts-ignore
      ctxRef.current = context;
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [canvasRef, ctxRef, color, strokeWidth]);

  // Update stroke color when color changes
  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = color;
    }
  }, [color, ctxRef]);

  // Hide controls after inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Only auto-hide on larger screens
      if (window.innerWidth > 768) {
        timeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle touch events for mobile devices
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastTouchX = 0;
    let lastTouchY = 0;
    let initialPinchDistance = 0;

    const handleTouchStart = (e: TouchEvent) => {
      setShowControls(true);

      if (e.touches.length === 1) {
        // Single touch - drawing
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = ((touch.clientX - rect.left) * scaleX) / 2 / zoomLevel - position.x;
        const y = ((touch.clientY - rect.top) * scaleY) / 2 / zoomLevel - position.y;

        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;

        if (tool === "Pencil") {
          setElements((prevElements) => [
            ...prevElements,
            {
              offsetX: x,
              offsetY: y,
              path: [[x, y]],
              stroke: color,
              element: tool,
              strokeWidth,
            },
          ]);
          setIsDrawing(true);
        } else if (tool === "Text") {
          const text = prompt("Enter the text:", "Sample Text");
          if (text) {
            setElements((prevElements) => [
              ...prevElements,
              {
                offsetX: x,
                offsetY: y,
                text,
                stroke: color,
                element: tool,
                strokeWidth,
              },
            ]);
          }
        } else {
          setElements((prevElements) => [
            ...prevElements,
            { offsetX: x, offsetY: y, stroke: color, element: tool, strokeWidth },
          ]);
          setIsDrawing(true);
        }
      } else if (e.touches.length === 2) {
        // Two finger touch - pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialPinchDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        setIsPanning(true);
      } else if (e.touches.length === 3) {
        // Three finger touch - panning
        setIsPanning(true);
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDrawing && !isPanning) return;

      if (e.touches.length === 1 && isDrawing) {
        // Drawing with one finger
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = ((touch.clientX - rect.left) * scaleX) / 2 / zoomLevel - position.x;
        const y = ((touch.clientY - rect.top) * scaleY) / 2 / zoomLevel - position.y;

        setElements((prevElements) =>
          prevElements.map((ele, index) =>
            index === elements.length - 1
              ? {
                ...ele,
                ...(tool === "Rectangle" && {
                  width: x - ele.offsetX,
                  height: y - ele.offsetY,
                }),
                ...(tool === "Line" && {
                  width: x,
                  height: y,
                }),
                ...(tool === "Circle" && {
                  radius: Math.sqrt(
                    (x - ele.offsetX) ** 2 + (y - ele.offsetY) ** 2
                  ),
                }),
                ...(tool === "Ellipse" && {
                  width: x - ele.offsetX,
                  height: y - ele.offsetY,
                }),
                ...(tool === "Pencil" && {
                  path: [...(ele.path || []), [x, y]],
                }),
              }
              : ele
          )
        );
      } else if (e.touches.length === 2) {
        // Pinch zoom
        e.preventDefault();

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        const currentPinchDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );

        if (initialPinchDistance > 0) {
          const pinchRatio = currentPinchDistance / initialPinchDistance;
          if (Math.abs(pinchRatio - 1) > 0.05) {
            setZoomLevel((prev) => Math.min(Math.max(0.5, prev * pinchRatio), 3));
            initialPinchDistance = currentPinchDistance;
          }
        }

        // Also handle panning with the midpoint
        const midX = (touch1.clientX + touch2.clientX) / 2;
        const midY = (touch1.clientY + touch2.clientY) / 2;

        const movementX = midX - lastTouchX;
        const movementY = midY - lastTouchY;

        if (Math.abs(movementX) > 5 || Math.abs(movementY) > 5) {
          setPosition((prev) => ({
            x: prev.x + movementX / zoomLevel,
            y: prev.y + movementY / zoomLevel,
          }));

          lastTouchX = midX;
          lastTouchY = midY;
        }
      } else if (e.touches.length === 3) {
        // Panning with three fingers
        e.preventDefault();
        const touch = e.touches[0];

        const movementX = touch.clientX - lastTouchX;
        const movementY = touch.clientY - lastTouchY;

        setPosition((prev) => ({
          x: prev.x + movementX / zoomLevel,
          y: prev.y + movementY / zoomLevel,
        }));

        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        setIsDrawing(false);
        setIsPanning(false);

        // Emit updated canvas state if a draw operation completed
        if (isDrawing && canvasRef.current) {
          const canvasImage = canvasRef.current.toDataURL();
          socket?.emit("drawing", { canvasImage, roomName });
        }
      }
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [canvasRef, color, elements, isDrawing, isPanning, position, setElements, socket, strokeWidth, tool, zoomLevel]);

  // Wheel event for zooming
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel((prev) => Math.min(Math.max(0.5, prev + delta), 3));
    }
  };

  // Mouse events for drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1 || e.button === 2 || e.altKey) {
      // Middle button or right button or Alt+click for panning
      setIsPanning(true);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Calculate coordinates with zoom and pan adjustment
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = ((e.clientX - rect.left) * scaleX) / 2 / zoomLevel - position.x;
    const y = ((e.clientY - rect.top) * scaleY) / 2 / zoomLevel - position.y;

    if (tool === "Pencil") {
      setElements((prevElements) => [
        ...prevElements,
        {
          offsetX: x,
          offsetY: y,
          path: [[x, y]],
          stroke: color,
          element: tool,
          strokeWidth,
        },
      ]);
    } else if (tool === "Text") {
      const text = prompt("Enter the text:", "Sample Text");
      if (text) {
        setElements((prevElements) => [
          ...prevElements,
          {
            offsetX: x,
            offsetY: y,
            text,
            stroke: color,
            element: tool,
            strokeWidth,
          },
        ]);
      }
    } else {
      setElements((prevElements) => [
        ...prevElements,
        { offsetX: x, offsetY: y, stroke: color, element: tool, strokeWidth },
      ]);
    }

    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = ((e.clientX - rect.left) * scaleX) / 2 / zoomLevel - position.x;
    const y = ((e.clientY - rect.top) * scaleY) / 2 / zoomLevel - position.y;

    // Handle panning
    if (isPanning) {
      setPosition((prev) => ({
        x: prev.x + e.movementX / zoomLevel,
        y: prev.y + e.movementY / zoomLevel,
      }));
      return;
    }

    if (!isDrawing) return;

    setElements((prevElements) =>
      prevElements.map((ele, index) =>
        index === elements.length - 1
          ? {
            ...ele,
            ...(tool === "Rectangle" && {
              width: x - ele.offsetX,
              height: y - ele.offsetY,
            }),
            ...(tool === "Line" && {
              width: x,
              height: y,
            }),
            ...(tool === "Circle" && {
              radius: Math.sqrt(
                (x - ele.offsetX) ** 2 + (y - ele.offsetY) ** 2
              ),
            }),
            ...(tool === "Ellipse" && {
              width: x - ele.offsetX,
              height: y - ele.offsetY,
            }),
            ...(tool === "Pencil" && {
              path: [...(ele.path || []), [x, y]],
            }),
          }
          : ele
      )
    );
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsPanning(false);

    // Emit updated canvas state if a draw operation completed
    if (isDrawing && canvasRef.current) {
      const canvasImage = canvasRef.current.toDataURL();
      socket?.emit("drawing", { canvasImage, roomName });
    }
  };

  // Keyboard shortcuts for tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDrawing(false);
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Context menu prevention
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Draw elements on canvas
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current) return;

    const roughCanvas = rough.canvas(canvas);
    const ctx = ctxRef.current;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and panning transformation
    ctx.save();
    ctx.translate(position.x * zoomLevel, position.y * zoomLevel);
    ctx.scale(zoomLevel, zoomLevel);

    elements.forEach((ele) => {
      const width = ele.strokeWidth || 5;

      if (ele.element === "Rectangle") {
        roughCanvas.draw(
          generator.rectangle(ele.offsetX, ele.offsetY, ele.width || 0, ele.height || 0, {
            stroke: ele.stroke,
            roughness: 0,
            strokeWidth: width,
          })
        );
      } else if (ele.element === "Line") {
        roughCanvas.draw(
          generator.line(ele.offsetX, ele.offsetY, ele.width || 0, ele.height || 0, {
            stroke: ele.stroke,
            roughness: 0,
            strokeWidth: width,
          })
        );
      } else if (ele.element === "Circle") {
        roughCanvas.draw(
          generator.circle(ele.offsetX, ele.offsetY, ele.radius || 0, {
            stroke: ele.stroke,
            roughness: 0,
            strokeWidth: width,
          })
        );
      } else if (ele.element === "Ellipse") {
        roughCanvas.draw(
          generator.ellipse(
            ele.offsetX,
            ele.offsetY,
            ele.width || 0,
            ele.height || 0,
            {
              stroke: ele.stroke,
              roughness: 0,
              strokeWidth: width,
            }
          )
        );
      } else if (ele.element === "Pencil") {
        if (ele.path) {
          roughCanvas.linearPath(ele.path, {
            stroke: ele.stroke,
            roughness: 0,
            strokeWidth: width,
          });
        }
      } else if (ele.element === "Text" && ele.text) {
        ctx.fillStyle = ele.stroke;
        ctx.font = "20px Arial";
        ctx.fillText(ele.text, ele.offsetX, ele.offsetY);
      }
    });

    ctx.restore();

    // Only emit if socket exists
    if (socket) {
      const canvasImage = canvas.toDataURL();
      socket.emit("drawing", { canvasImage, roomName });
    }
  }, [elements, zoomLevel, position, canvasRef, ctxRef, socket,roomName]);

  // Get device type and orientation for adaptive UI
  const isSmallScreen = typeof window !== 'undefined' ? window.innerWidth < 640 : false;
  const isMediumScreen = typeof window !== 'undefined' ? window.innerWidth >= 640 && window.innerWidth < 1024 : false;
  const isLandscape = typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false;

  return (
    <motion.div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl border border-slate-700"
      style={{
        height: isSmallScreen ? "calc(100vh - 120px)" : isMediumScreen ? "500px" : "600px",
        maxHeight: "calc(100vh - 80px)"
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
    >
      {img ? (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <img
            src={img}
            alt="collaborative board"
            className="max-w-full max-h-full"
            style={{
              transform: `scale(${zoomLevel}) translate(${position.x}px, ${position.y}px)`,
            }}
          />
        </motion.div>
      ) : (
        <canvas
        ref={canvasRef as React.RefObject<HTMLCanvasElement>}
        className="cursor-crosshair touch-none"
      />
      )}

      {/* Floating toolbar - different layouts for different screens */}
      <motion.div
        className={`${isSmallScreen
          ? (isLandscape ? 'absolute right-4 top-1/2 transform -translate-y-1/2 flex-col' : 'absolute bottom-4 left-1/2 transform -translate-x-1/2')
          : 'absolute bottom-4 left-1/2 transform -translate-x-1/2'
          } bg-slate-800/90 backdrop-blur-sm rounded-full px-3 py-2 flex items-center gap-2 shadow-lg border border-slate-600 transition-opacity duration-300`}
        style={{ opacity: showControls ? 1 : (isSmallScreen ? 1 : 0.2) }}
        initial={{ y: 50, opacity: 0 }}
        animate={{
          y: isSmallScreen && isLandscape ? 0 : 0,
          x: isSmallScreen && isLandscape ? 0 : 0,
          opacity: 1
        }}
        transition={{ delay: 0.2, duration: 0.3 }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => {
          if (window.innerWidth > 768) {
            timeoutRef.current = setTimeout(() => {
              setShowControls(false);
            }, 3000);
          }
        }}
      >
        {isSmallScreen && isLandscape ? (
          // Vertical toolbar for landscape small screens
          <>
            <div className="flex flex-col items-center gap-3 p-1">
              <button
                className="text-white hover:bg-slate-700 p-1 rounded-full transition-colors"
                onClick={() => setZoomLevel(1)}
                title="Reset zoom"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </button>
              <div className="text-white text-xs font-medium">{Math.round(zoomLevel * 100)}%</div>

              <div className="h-px w-full bg-slate-600 my-1"></div>

              <div className="text-white text-xs">Size</div>
              <input
                type="range"
                min="1"
                max="20"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                style={{ transform: "rotate(90deg)", width: "60px", margin: "30px 0" }}
              />
              <div className="text-white text-xs">{strokeWidth}px</div>

              <div className="h-px w-full bg-slate-600 my-1"></div>

              <div className="text-white text-xs">
                {isPanning ? "Panning" : tool}
              </div>
            </div>
          </>
        ) : (
          // Horizontal toolbar for portrait and larger screens
          <>
            <div className="flex items-center gap-2">
              <button
                className="text-white hover:bg-slate-700 p-1 rounded-full transition-colors"
                onClick={() => setZoomLevel(1)}
                title="Reset zoom"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </button>
              <div className="text-white text-xs font-medium">{Math.round(zoomLevel * 100)}%</div>
            </div>

            <div className="h-6 w-px bg-slate-600"></div>

            {!isSmallScreen && (
              <div className="flex items-center gap-2">
                <div className="text-white text-xs">Size:</div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                  className="w-16 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-white text-xs">{strokeWidth}px</div>
              </div>
            )}

            {isSmallScreen && (
              <div className="flex items-center gap-2">
                <div className="text-white text-xs">Size:</div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                  className="w-12 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-white text-xs">{strokeWidth}</div>
              </div>
            )}

            <div className="h-6 w-px bg-slate-600"></div>

            <div className="text-white text-xs">
              {isPanning ? "Panning" : tool}
            </div>
          </>
        )}
      </motion.div>

      {/* Status indicator - adaptive position */}
      <div className={`absolute ${isSmallScreen ? 'top-2 right-2 px-1.5 py-0.5' : 'top-3 right-3 px-2 py-1'} flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm rounded-full`}>
        <div className={`w-2 h-2 rounded-full ${socket ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-xs text-slate-300">{socket ? 'Connected' : 'Offline'}</span>
      </div>

      {/* Helpful tips - adaptively shown only on larger screens or when tapped */}
      {(!isSmallScreen || showControls) && (
        <motion.div
          className={`absolute ${isSmallScreen ? 'top-2 left-2 px-2 py-0.5' : 'top-3 left-3 px-3 py-1'} bg-slate-800/50 backdrop-blur-sm rounded-lg text-xs text-slate-300`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          {isSmallScreen ? (
            isLandscape ? '2 fingers: Zoom • 3 fingers: Pan' : 'Pinch: Zoom • Hold: Pan'
          ) : (
            'Alt+Click: Pan • Ctrl+Scroll: Zoom • Esc: Cancel'
          )}
        </motion.div>
      )}

      {/* Mobile-specific touch instruction that appears briefly on first load */}
      {isSmallScreen && (
        <motion.div
          className="absolute inset-0 bg-black/70 flex items-center justify-center z-10"
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 1.5, duration: 1 }}
          style={{ pointerEvents: "none" }}
        >
          <div className="text-white text-center p-6 bg-slate-800/80 rounded-xl max-w-xs">
            <div className="text-lg font-bold mb-2">Touch Controls</div>
            <div className="mb-4">
              • Draw with one finger<br />
              • Pinch with two fingers to zoom<br />
              • Use three fingers to pan<br />
              • Double tap to open tools
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};