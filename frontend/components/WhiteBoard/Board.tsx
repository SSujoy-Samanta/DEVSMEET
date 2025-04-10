'use client';
import { useEffect, useRef, useState } from 'react';
import { Tool } from './Tool';
import Button from '../Buttons/Button';
import { BoardCanvas } from './BoradCanvas';
import { ToolContents } from '@/utils/Tools';
import { io, Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import { SiCcleaner } from "react-icons/si";
import { LuRedo2 } from 'react-icons/lu';
import { GrUndo } from 'react-icons/gr';
import { FiSettings } from 'react-icons/fi';
import { IoMdColorPalette } from 'react-icons/io';


export const Board = ({roomName}:{roomName:string}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const [elements, setElements] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [tool, setTool] = useState<string>('Pencil');
    const [color, setColor] = useState<string>('#ffffff');
    const [isClient, setIsClient] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipContent, setTooltipContent] = useState('');
    const [showMobileTools, setShowMobileTools] = useState(false);
    const [showMobileColors, setShowMobileColors] = useState(false);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [screenSize, setScreenSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 1200,
        height: typeof window !== 'undefined' ? window.innerHeight : 800
    });

    // Handle screen resize
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const handleResize = () => {
            setScreenSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Socket connection handlers
    useEffect(() => {
        const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080');
        
        setSocket(socketInstance);
        
        socketInstance.on("connection-success", ({ socketId }: any) => {
            console.log("Connected to WebSocket:", socketId);
            socketInstance.emit("joinBoardRoom", { roomName });
            
            // Show temporary connection notification
            showNotification("Connected to drawing room");
        });
        
        return () => {
            socketInstance.off("connection-success");
        };
    
    }, [roomName]);

    // Client-side initialization
    useEffect(() => {
        setIsClient(true);
    }, [roomName]);

    // Handle undo operation
    const undo = () => {
        if (elements.length === 0) return;
        
        const lastElement = elements[elements.length - 1];
        setHistory(prevs => [...prevs, lastElement]);
        setElements(prevs => prevs.slice(0, prevs.length - 1));
        showNotification("Undo successful");
    };

    // Handle redo operation
    const redo = () => {
        if (history.length === 0) return;
        
        const lastHistory = history[history.length - 1];
        setElements(prevs => [...prevs, lastHistory]);
        setHistory(prevs => prevs.slice(0, prevs.length - 1));
        showNotification("Redo successful");
    };

    // Handle clear canvas
    const clearCanvas = () => {
        setElements([]);
        showNotification("Canvas cleared");
    };

    // Show temporary notification
    const showNotification = (message: string) => {
        setTooltipContent(message);
        setShowTooltip(true);
        
        setTimeout(() => {
            setShowTooltip(false);
        }, 2000);
    };

    // Handle tool selection
    const handleToolSelect = (toolName: string) => {
        setTool(toolName);
        showNotification(`${toolName} selected`);
        if (screenSize.width < 640) {
            setShowMobileTools(false);
        }
    };

    // Handle color change
    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setColor(e.target.value);
        if (screenSize.width < 640) {
            setShowMobileColors(false);
        }
    };

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                undo();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [elements, history]);

    // Toggle mobile tools panel
    const toggleMobileTools = () => {
        setShowMobileTools(!showMobileTools);
        setShowMobileColors(false);
    };

    // Toggle mobile colors panel
    const toggleMobileColors = () => {
        setShowMobileColors(!showMobileColors);
        setShowMobileTools(false);
    };

    if (!isClient) return null;

    // Determine if we're on a small screen
    const isMobile = screenSize.width < 640;
    const isTablet = screenSize.width >= 640 && screenSize.width < 1024;

    return (
        <div className="w-full mx-auto flex flex-col justify-center items-center relative">
            {/* Toolbar - changes layout based on screen size */}
            <motion.div 
                className={`w-full bg-slate-800 rounded-lg shadow-lg mb-2 sm:mb-4 ${isMobile ? 'p-2' : 'p-3'}`}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {/* Desktop/Tablet Toolbar */}
                {!isMobile && (
                    <div className={`flex ${isTablet ? 'flex-wrap' : 'flex-nowrap'} justify-between gap-2 sm:gap-4`}>
                        {/* Drawing Tools */}
                        <motion.div 
                            className="flex flex-wrap gap-1 sm:gap-2 justify-center items-center"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                        >
                            {ToolContents.map((x, ind) => (
                                <Tool 
                                    key={ind} 
                                    name={x} 
                                    value={x} 
                                    setTool={() => handleToolSelect(x)} 
                                    type="radio" 
                                    tool={tool} 
                                />
                            ))}
                        </motion.div>
                        
                        {/* Color Picker */}
                        <motion.div 
                            className="flex items-center gap-2"
                            whileHover={{ scale: 1.05 }}
                        >
                            <label htmlFor="color" className="font-medium text-white">Color:</label>
                            <div className="relative">
                                <div 
                                    className="w-8 h-8 rounded-full cursor-pointer border-2 border-white shadow-md"
                                    style={{ backgroundColor: color }}
                                    onClick={() => document.getElementById('color')?.click()}
                                />
                                <input
                                    type="color"
                                    value={color}
                                    id="color"
                                    onChange={handleColorChange}
                                    className="opacity-0 absolute top-0 left-0 w-8 h-8 cursor-pointer"
                                />
                            </div>
                        </motion.div>
                        
                        {/* History Controls */}
                        <div className="flex gap-1 sm:gap-2">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button 
                                    key="undo" 
                                    label="UNDO" 
                                    onClick={undo} 
                                    variant="goldenGlow"
                                    disabled={elements.length === 0}
                                    className="flex justify-center items-center gap-1 sm:gap-2 text-center"
                                >
                                    <GrUndo />
                                </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button 
                                    key="redo" 
                                    label="REDO" 
                                    onClick={redo} 
                                    variant="sunsetGlow" 
                                    disabled={history.length === 0}
                                    className="flex justify-center items-center gap-1 sm:gap-2 text-center"
                                >
                                    <LuRedo2 />
                                </Button>
                            </motion.div>
                        </div>
                        
                        {/* Clear Button */}
                        <motion.div 
                            whileHover={{ scale: 1.05 }} 
                            whileTap={{ scale: 0.95 }}
                        >
                            <Button 
                                key="clear" 
                                label="CLEAR" 
                                onClick={clearCanvas} 
                                variant="fieryRed" 
                                className="flex justify-center items-center gap-1 sm:gap-2 text-center"
                            >
                                <SiCcleaner/>
                            </Button>
                        </motion.div>
                    </div>
                )}

                {/* Mobile Toolbar */}
                {isMobile && (
                    <div className="flex justify-center items-center flex-col gap-2 w-full">
                        {/* Mobile Tool Dropdown Button */}
                        <div className=' flex justify-between w-full'>
                            <Button
                                label='tools'
                                key="tools"
                                onClick={toggleMobileTools}
                                variant="steelGray"
                                className="flex justify-center items-center gap-1 text-center"
                            >
                                <FiSettings />
                            </Button>

                            {/* Currently Selected Tool */}
                            <div className="bg-teal-500/20 rounded p-1 px-3 flex justify-center items-center text-white text-xs">
                                {tool}
                            </div>

                            {/* Mobile Color Button */}
                            <Button
                                label='colors'
                                key="colors"
                                onClick={toggleMobileColors}
                                variant="aquaBreeze"
                                className="flex justify-center items-center gap-1 text-center"
                            >
                                <IoMdColorPalette />
                            </Button>

                        </div>
                        {/* Quick Action Buttons */}
                        <div className="flex gap-1 justify-between w-full">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} >
                                <Button 
                                    label='undo'
                                    key="undo" 
                                    onClick={undo} 
                                    variant="goldenGlow"
                                    disabled={elements.length === 0}
                                    className="flex justify-center items-center p-1 gap-2"
                                >
                                    <GrUndo className="w-4 h-4" />
                                </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button 
                                    key="redo" 
                                    label="REDO" 
                                    onClick={redo} 
                                    variant="sunsetGlow" 
                                    disabled={history.length === 0}
                                    className="flex justify-center items-center gap-2 text-center"
                                >
                                    <LuRedo2 />
                                </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button 
                                    label='clear'
                                    key="clear" 
                                    onClick={clearCanvas} 
                                    variant="fieryRed" 
                                    className="flex justify-center items-center p-1 gap-2"
                                >
                                    <SiCcleaner className="w-4 h-4" />
                                </Button>
                            </motion.div>
                        </div>
                    </div>
                )}

                {/* Mobile Tools Panel */}
                {isMobile && showMobileTools && (
                    <motion.div
                        className="mt-2 p-2 bg-gray-700 rounded-md shadow-lg"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="grid grid-cols-3 gap-2">
                            {ToolContents.map((x, ind) => (
                                <Tool 
                                    key={ind} 
                                    name={x} 
                                    value={x} 
                                    setTool={() => handleToolSelect(x)} 
                                    type="radio" 
                                    tool={tool} 
                                />
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Mobile Colors Panel */}
                {isMobile && showMobileColors && (
                    <motion.div
                        className="mt-2 p-2 bg-gray-700 rounded-md shadow-lg"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-center gap-2">
                                <label htmlFor="mobile-color" className="font-medium text-white">Pick Color:</label>
                                <div className="relative">
                                    <div 
                                        className="w-10 h-10 rounded-full cursor-pointer border-2 border-white shadow-md"
                                        style={{ backgroundColor: color }}
                                        onClick={() => document.getElementById('mobile-color')?.click()}
                                    />
                                    <input
                                        type="color"
                                        value={color}
                                        id="mobile-color"
                                        onChange={handleColorChange}
                                        className="opacity-0 absolute top-0 left-0 w-10 h-10"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
                                  '#ff00ff', '#00ffff', '#ffffff', '#ff9900', '#9900ff'].map((presetColor) => (
                                    <div 
                                        key={presetColor}
                                        className="w-8 h-8 rounded-full cursor-pointer border-2 border-white shadow-md mx-auto"
                                        style={{ backgroundColor: presetColor }}
                                        onClick={() => {
                                            setColor(presetColor);
                                            setShowMobileColors(false);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </motion.div>
            
            {/* Drawing Canvas - responsive height */}
            <motion.div 
                className="w-full  rounded-lg overflow-hidden"
                style={{ 
                    height: isMobile 
                        ? `${screenSize.height * 0.6}px` 
                        : isTablet 
                            ? `${screenSize.height * 0.7}px` 
                            : `${screenSize.height * 0.75}px` 
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
            >
                {
                    socket &&
                    <BoardCanvas
                        canvasRef={canvasRef}
                        ctxRef={ctxRef}
                        elements={elements}
                        setElements={setElements}
                        color={color}
                        tool={tool}
                        socket={socket}
                        roomName={roomName}
                    />
                }
            </motion.div>
            
            {/* Tooltips/Notifications - responsive positioning */}
            {showTooltip && (
                <motion.div
                    className={`fixed ${isMobile ? 'bottom-2 right-2 left-2 text-center' : 'bottom-4 right-4'} bg-gray-800 text-white py-2 px-4 rounded-md shadow-lg z-50`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                >
                    {tooltipContent}
                </motion.div>
            )}
            
            
        </div>
    );
};