"use client";
import React, { useState, useEffect } from 'react';
import { ChevronRight, Users, Edit3, MessageSquare, Video, Lock } from 'lucide-react';
import { MdOutlineVideoCameraFront } from 'react-icons/md';
import { FcBusinessContact } from 'react-icons/fc';

export default function HeroPage() {
    const [isVisible, setIsVisible] = useState(false);
    const [activeFeature, setActiveFeature] = useState(0);

    const features = [
        {
            icon: <Video className="text-indigo-500" size={24} />,
            title: "Crystal Clear Video Calls",
            description: "Connect with your team through high-quality, lag-free video conferencing that brings everyone together."
        },
        {
            icon: <Edit3 className="text-indigo-500" size={24} />,
            title: "Interactive Whiteboard",
            description: "Visualize ideas, sketch concepts, and collaborate in real-time with our intuitive whiteboard canvas."
        },
        {
            icon: <Users className="text-indigo-500" size={24} />,
            title: "Seamless Collaboration",
            description: "Work together with multiple participants sharing and editing content simultaneously."
        },
        {
            icon: <MessageSquare className="text-indigo-500" size={24} />,
            title: "Integrated Chat",
            description: "Share links, files, and messages without interrupting the flow of your meeting."
        },
        {
            icon: <Lock className="text-indigo-500" size={24} />,
            title: "Secure Meetings",
            description: "End-to-end encryption and advanced privacy controls keep your conversations confidential."
        }
    ];

    // Animation timing
    useEffect(() => {
        setIsVisible(true);

        const featureInterval = setInterval(() => {
            setActiveFeature((prev) => (prev + 1) % features.length);
        }, 3000);

        return () => clearInterval(featureInterval);
    }, [features.length]);

    return (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 min-h-screen text-white">
            {/* Navigation */}
            <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center text-center">
                        <MdOutlineVideoCameraFront size={25} />
                    </div>
                    <span className="text-xl font-bold">DevsMeet</span>
                </div>

                <div className="hidden md:flex items-center space-x-8">
                    <a href="#features" className="hover:text-indigo-300 transition-colors">Features</a>
                    <a href="#pricing" className="hover:text-indigo-300 transition-colors">Pricing</a>
                    <a href="#testimonials" className="hover:text-indigo-300 transition-colors">Testimonials</a>
                    <a href="#faq" className="hover:text-indigo-300 transition-colors">FAQ</a>
                </div>

                <div className="flex items-center space-x-4">
                    {/* <a href="/login" className="hover:text-indigo-300 transition-colors hidden md:block">Login</a> */}
                    <a href="/home" className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-lg transition-colors">Get Started</a>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="container mx-auto px-6 pt-16 pb-24">
                <div className="flex flex-col lg:flex-row items-center">
                    {/* Hero Text */}
                    <div className={`w-full lg:w-1/2 text-center lg:text-left mb-12 lg:mb-0 transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                            Collaborate <span className="text-indigo-400">Visually</span>, Connect <span className="text-indigo-400">Seamlessly</span>
                        </h1>
                        <p className="text-xl text-slate-300 mb-8 max-w-xl mx-auto lg:mx-0">
                            The all-in-one platform that combines interactive whiteboards with crystal clear video calls. Bring your remote teams together like never before.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                            <a href="/home" className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-8 py-3 rounded-lg transition-colors flex items-center justify-center">
                                Start for Free
                                <ChevronRight size={20} className="ml-2" />
                            </a>
                            <a href="/home" className="bg-transparent border border-white hover:bg-white hover:text-indigo-900 text-white font-medium px-8 py-3 rounded-lg transition-colors flex items-center justify-center">
                                Watch Demo
                            </a>
                        </div>
                    </div>

                    {/* Hero Image/Animation */}
                    <div className={`w-full lg:w-1/2 transition-all duration-1000 delay-300 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                        <div className="relative">
                            {/* Main platform UI mockup */}
                            <div className="bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-700">
                                {/* Platform header */}
                                <div className="bg-slate-900 p-3 flex items-center justify-between border-b border-slate-700">
                                    <div className="flex space-x-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    </div>
                                    <div className="bg-slate-800 rounded-md px-3 py-1 text-xs">DevsMeet Meeting</div>
                                    <div className="w-10"></div>
                                </div>

                                {/* Platform content */}
                                <div className="p-4">
                                    {/* Video grid */}
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="rounded-lg bg-slate-700 aspect-video relative overflow-hidden">
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <FcBusinessContact size={40} />
                                                </div>
                                                <div className="absolute bottom-1 left-1 bg-black/50 rounded px-1 text-xs">
                                                    User {i}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Whiteboard */}
                                    <div className="bg-white rounded-lg aspect-video relative">
                                        <div className="absolute top-2 left-2 right-2 flex justify-between">
                                            <div className="flex space-x-1">
                                                <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
                                                    <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                                                </div>
                                                <div className="w-6 h-6 rounded bg-slate-100"></div>
                                                <div className="w-6 h-6 rounded bg-slate-100"></div>
                                            </div>
                                            <div className="flex -space-x-1">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center">
                                                        <span className="text-xs">U{i}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Sample whiteboard content */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-1/2 h-1/3 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                                                <span className="text-black text-xs">Drag content here</span>
                                            </div>
                                            <div className="absolute top-1/3 left-1/4 w-16 h-16 rounded-full border-2 border-blue-500"></div>
                                            <div className="absolute bottom-1/4 right-1/3 w-24 h-12 border-2 border-green-500"></div>
                                            {/* Animated drawing line */}
                                            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                                                <path
                                                    d="M20,100 Q60,20 100,100 T180,100"
                                                    fill="none"
                                                    stroke="red"
                                                    strokeWidth="2"
                                                    strokeDasharray="200"
                                                    strokeDashoffset="200"
                                                    className="animate-draw"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating elements */}
                            <div className="absolute -top-6 -right-6 bg-indigo-500 rounded-lg p-4 shadow-lg animate-float-slow">
                                <Users size={24} />
                            </div>
                            <div className="absolute -bottom-4 -left-4 bg-green-500 rounded-lg p-4 shadow-lg animate-float">
                                <Edit3 size={24} />
                            </div>
                            <div className="absolute top-1/2 -right-8 bg-yellow-500 rounded-lg p-4 shadow-lg animate-float-medium">
                                <MessageSquare size={24} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section Preview */}
            <div className="bg-slate-900/50 backdrop-blur-sm py-20">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Teams Love DevsMeet</h2>
                        <p className="text-slate-300 max-w-2xl mx-auto">Our platform combines powerful collaboration tools to help your team work together from anywhere.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className={`bg-slate-800/70 rounded-xl p-6 transition-all duration-500 border-2 ${index === activeFeature ? 'border-indigo-500 scale-105 shadow-xl shadow-indigo-500/20' : 'border-transparent'}`}
                            >
                                <div className="bg-slate-700/70 inline-flex rounded-lg p-3 mb-4">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                                <p className="text-slate-300">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Call to action */}
            <div className="container mx-auto px-6 py-20 text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to transform how your team collaborates?</h2>
                <p className="text-slate-300 max-w-2xl mx-auto mb-8">Join thousands of teams that have enhanced their productivity with DevsMeet.</p>
                <a href="/signup" className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium px-8 py-4 rounded-lg transition-all transform hover:scale-105">
                    Start Your Free Trial
                </a>
                <p className="text-slate-400 mt-4">No credit card required. 14-day free trial.</p>
            </div>

            {/* Custom styles for animations */}
            <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 4s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 5s ease-in-out infinite;
        }
        .animate-draw {
          animation: draw 2s linear forwards;
        }
      `}</style>
        </div>
    );
}