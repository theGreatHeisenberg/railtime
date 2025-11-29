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
import { Settings, X, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SettingsModalProps {
    stations: Station[];
}

export default function SettingsModal({ stations }: SettingsModalProps) {
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
        // Optional: We could trigger a toast or notification here
    };

    if (!isOpen) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-slate-100"
                onClick={() => setIsOpen(true)}
                title="Settings"
            >
                <Settings className="h-6 w-6" />
            </Button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Settings className="h-5 w-5" /> Settings
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-white"
                        onClick={() => setIsOpen(false)}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Default Origin</label>
                        <Select value={defaultOrigin} onValueChange={setDefaultOrigin}>
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                <SelectValue placeholder="Select Origin" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-slate-100 max-h-[300px]">
                                {stations.map((s) => (
                                    <SelectItem key={s.stopname} value={s.stopname}>
                                        {s.stopname}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">This station will be selected automatically when you visit.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Default Destination</label>
                        <Select value={defaultDestination} onValueChange={setDefaultDestination}>
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                <SelectValue placeholder="Select Destination" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-slate-100 max-h-[300px]">
                                <SelectItem value="All">All Destinations</SelectItem>
                                {stations
                                    .filter((s) => s.stopname !== defaultOrigin)
                                    .map((s) => (
                                        <SelectItem key={s.stopname} value={s.stopname}>
                                            {s.stopname}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">Optional default destination filter.</p>
                    </div>

                    <div className="pt-2">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-2" /> Save Defaults
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
