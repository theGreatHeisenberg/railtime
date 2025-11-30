"use client";

import { useState, useEffect } from "react";
import { Station } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface TerminalSettingsModalProps {
    stations: Station[];
}

export default function TerminalSettingsModal({ stations }: TerminalSettingsModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [defaultOrigin, setDefaultOrigin] = useState("Sunnyvale");
    const [defaultDestination, setDefaultDestination] = useState("Palo Alto");

    // Load settings when modal opens
    useEffect(() => {
        if (isOpen) {
            const savedOrigin = localStorage.getItem("defaultOrigin");
            const savedDest = localStorage.getItem("defaultDestination");
            if (savedOrigin) setDefaultOrigin(savedOrigin);
            if (savedDest) setDefaultDestination(savedDest);
        }
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem("defaultOrigin", defaultOrigin);
        localStorage.setItem("defaultDestination", defaultDestination);
        setIsOpen(false);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="text-green-400 hover:text-yellow-400 transition-colors font-mono text-xs tracking-widest hover:bg-green-950/30 px-2 py-1"
                title="Settings"
            >
                [⚙]
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-black border-2 border-cyan-400 text-cyan-300 font-mono text-xs shadow-2xl" style={{boxShadow: '0 0 40px rgba(6, 182, 212, 0.3)'}}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-cyan-400 p-3 bg-cyan-950/20">
                    <div className="text-cyan-400 font-bold tracking-widest">
                        ╔═══ SYSTEM SETTINGS ═══╗
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-cyan-400 hover:text-pink-400 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Origin Setting */}
                    <div className="space-y-2 border-l-2 border-cyan-400 pl-3">
                        <label className="text-green-400 text-xs tracking-wider">
                            DEFAULT_ORIGIN_STATION
                        </label>
                        <Select value={defaultOrigin} onValueChange={setDefaultOrigin}>
                            <SelectTrigger className="bg-black border border-cyan-500/50 text-cyan-300 font-mono text-xs h-8">
                                <SelectValue placeholder=">" />
                            </SelectTrigger>
                            <SelectContent className="bg-black border border-cyan-500 text-cyan-300">
                                {stations.map((s) => (
                                    <SelectItem key={s.stopname} value={s.stopname}>
                                        {s.stopname}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="text-cyan-600 text-[10px] mt-1">
                            | Loaded on startup
                        </div>
                    </div>

                    {/* Destination Setting */}
                    <div className="space-y-2 border-l-2 border-pink-400 pl-3">
                        <label className="text-green-400 text-xs tracking-wider">
                            DEFAULT_DESTINATION
                        </label>
                        <Select value={defaultDestination} onValueChange={setDefaultDestination}>
                            <SelectTrigger className="bg-black border border-cyan-500/50 text-cyan-300 font-mono text-xs h-8">
                                <SelectValue placeholder=">" />
                            </SelectTrigger>
                            <SelectContent className="bg-black border border-cyan-500 text-cyan-300">
                                <SelectItem value="All">[ all destinations ]</SelectItem>
                                {stations
                                    .filter((s) => s.stopname !== defaultOrigin)
                                    .map((s) => (
                                        <SelectItem key={s.stopname} value={s.stopname}>
                                            {s.stopname}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        <div className="text-cyan-600 text-[10px] mt-1">
                            | Optional filter for predictions
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-cyan-400 p-3 bg-cyan-950/20 flex gap-2">
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-green-950/40 border border-green-500/50 text-green-400 hover:bg-green-950/60 py-1.5 font-mono text-xs tracking-wider transition-colors"
                    >
                        ▶ SAVE
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="flex-1 bg-pink-950/40 border border-pink-500/50 text-pink-400 hover:bg-pink-950/60 py-1.5 font-mono text-xs tracking-wider transition-colors"
                    >
                        ■ CANCEL
                    </button>
                </div>
            </div>
        </div>
    );
}
