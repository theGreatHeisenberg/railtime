"use client";

import { useTheme } from "@/lib/ThemeContext";
import { useEffect, useState } from "react";

export default function HolidayLights() {
    const { themeName } = useTheme();
    const [lights, setLights] = useState<Array<{ left: string; delay: string; color: string }>>([]);

    useEffect(() => {
        // Generate random positions and delays for lights
        const generatedLights = Array.from({ length: 30 }, (_, i) => ({
            left: `${(i * 100) / 30}%`,
            delay: `${Math.random() * 2}s`,
            color: ['red', 'green', 'yellow', 'blue'][Math.floor(Math.random() * 4)]
        }));
        setLights(generatedLights);
    }, []);

    if (themeName !== 'holiday') return null;

    return (
        <div className="fixed top-0 left-0 w-full h-16 pointer-events-none z-50 overflow-hidden">
            {/* String wire */}
            <svg className="absolute top-4 w-full h-8" preserveAspectRatio="none">
                <path
                    d="M 0,10 Q 50,20 100,10 T 200,10 T 300,10 T 400,10 T 500,10 T 600,10 T 700,10 T 800,10 T 900,10 T 1000,10 T 1100,10 T 1200,10 T 1300,10 T 1400,10 T 1500,10 T 1600,10 T 1700,10 T 1800,10 T 1900,10 T 2000,10"
                    stroke="rgba(34, 197, 94, 0.3)"
                    strokeWidth="2"
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>

            {/* Light bulbs */}
            {lights.map((light, i) => (
                <div
                    key={i}
                    className="absolute top-3"
                    style={{
                        left: light.left,
                        animation: `twinkle 2s ease-in-out infinite`,
                        animationDelay: light.delay,
                    }}
                >
                    {/* Bulb */}
                    <div
                        className={`w-3 h-4 rounded-full ${light.color === 'red' ? 'bg-red-500' :
                                light.color === 'green' ? 'bg-green-500' :
                                    light.color === 'yellow' ? 'bg-yellow-400' :
                                        'bg-blue-500'
                            }`}
                        style={{
                            boxShadow: `0 0 10px ${light.color === 'red' ? 'rgba(239, 68, 68, 0.8)' :
                                    light.color === 'green' ? 'rgba(34, 197, 94, 0.8)' :
                                        light.color === 'yellow' ? 'rgba(250, 204, 21, 0.8)' :
                                            'rgba(59, 130, 246, 0.8)'
                                }`,
                        }}
                    />
                    {/* Wire to bulb */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-green-800/50" />
                </div>
            ))}

            <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
        </div>
    );
}
