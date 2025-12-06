"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Star, Plus, X, Heart } from "lucide-react";
import { ThemeName } from "@/lib/themes";

// Types
export interface FavoriteRoute {
  id: string;
  name: string;
  origin: string;
  destination: string;
}

interface FavoriteRoutesProps {
  currentOrigin: string;
  currentDestination: string;
  onSelectRoute: (origin: string, destination: string) => void;
  themeName: ThemeName;
  showFeedback: (message: string) => void;
}

const MAX_FAVORITES = 3;
const STORAGE_KEY = "favoriteRoutes";

// Generate a short default name for a route
function generateRouteName(origin: string, destination: string): string {
  const getAbbr = (name: string) => {
    const abbrs: Record<string, string> = {
      "San Francisco": "SF",
      "San Jose Diridon": "SJ",
      "Palo Alto": "PA",
      "Mountain View": "MV",
      "Sunnyvale": "SV",
      "Redwood City": "RWC",
      "Millbrae": "MB",
      "Hillsdale": "HS",
      "San Mateo": "SM",
      "Menlo Park": "MP",
      "Santa Clara": "SC",
      "California Avenue": "Cal Ave",
    };
    return abbrs[name] || name.split(" ").map(w => w[0]).join("");
  };
  return `${getAbbr(origin)} → ${getAbbr(destination)}`;
}

export default function FavoriteRoutes({
  currentOrigin,
  currentDestination,
  onSelectRoute,
  themeName,
  showFeedback,
}: FavoriteRoutesProps) {
  const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const isSwiss = themeName === "swiss" || themeName === "swiss-dark";
  const isSwissDark = themeName === "swiss-dark";
  const isConfetti = themeName === "confetti";
  const isMinimalist = themeName === "minimalist";
  const isNapkin = themeName === "napkin";

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load favorites:", e);
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = useCallback((newFavorites: FavoriteRoute[]) => {
    setFavorites(newFavorites);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
    } catch (e) {
      console.error("Failed to save favorites:", e);
    }
  }, []);

  // Check if current route is already a favorite
  const isCurrentRouteFavorite = favorites.some(
    f => f.origin === currentOrigin && f.destination === currentDestination
  );

  // Add current route as favorite
  const handleAddFavorite = useCallback(() => {
    if (favorites.length >= MAX_FAVORITES) {
      showFeedback(`Maximum ${MAX_FAVORITES} favorites allowed`);
      return;
    }
    if (isCurrentRouteFavorite) {
      showFeedback("Route already saved");
      return;
    }
    if (!currentOrigin || !currentDestination) {
      showFeedback("Select a route first");
      return;
    }

    const defaultName = generateRouteName(currentOrigin, currentDestination);
    setNewName(defaultName);
    setIsAdding(true);
  }, [favorites.length, isCurrentRouteFavorite, currentOrigin, currentDestination, showFeedback]);

  // Confirm adding favorite
  const confirmAddFavorite = useCallback(() => {
    const name = newName.trim() || generateRouteName(currentOrigin, currentDestination);
    const newFavorite: FavoriteRoute = {
      id: `${Date.now()}`,
      name,
      origin: currentOrigin,
      destination: currentDestination,
    };
    saveFavorites([...favorites, newFavorite]);
    setIsAdding(false);
    setNewName("");
    showFeedback(`Saved "${name}"`);
  }, [newName, currentOrigin, currentDestination, favorites, saveFavorites, showFeedback]);

  // Remove a favorite
  const handleRemoveFavorite = useCallback((id: string) => {
    const favorite = favorites.find(f => f.id === id);
    const newFavorites = favorites.filter(f => f.id !== id);
    saveFavorites(newFavorites);
    showFeedback(`Removed "${favorite?.name}"`);
  }, [favorites, saveFavorites, showFeedback]);

  // Select a favorite route
  const handleSelectFavorite = useCallback((favorite: FavoriteRoute) => {
    onSelectRoute(favorite.origin, favorite.destination);
    showFeedback(`Switched to ${favorite.name}`);
  }, [onSelectRoute, showFeedback]);

  // Theme-aware styles
  const getButtonStyles = (isActive: boolean) => {
    if (isSwissDark) {
      return isActive
        ? "bg-[#E31837] text-white border-[#E31837] shadow-lg"
        : "bg-[#374151] text-[#F9FAFB] border-[#4B5563] hover:border-[#F87171] hover:text-[#F87171]";
    }
    if (isSwiss) {
      return isActive
        ? "bg-[#E31837] text-white border-[#E31837]"
        : "bg-white text-[#111827] border-[#E5E7EB] hover:border-[#E31837] hover:text-[#E31837]";
    }
    if (isConfetti) {
      return isActive
        ? "bg-[#8B5CF6] text-white border-[#1E293B] shadow-[2px_2px_0px_0px_#1E293B]"
        : "bg-white text-[#1E293B] border-[#1E293B] hover:bg-[#FBBF24] shadow-[2px_2px_0px_0px_#1E293B]";
    }
    if (isMinimalist) {
      return isActive
        ? "bg-[#FF3000] text-white border-black"
        : "bg-white text-black border-black hover:bg-[#F2F2F2]";
    }
    if (isNapkin) {
      return isActive
        ? "bg-[#ff4d4d] text-white border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d]"
        : "bg-white text-[#2d2d2d] border-[#2d2d2d] hover:bg-[#fff9c4] shadow-[2px_2px_0px_0px_#2d2d2d]";
    }
    // Obsidian
    return isActive
      ? "bg-[#5E6AD2] text-white border-[#5E6AD2]/50"
      : "bg-white/5 text-white/80 border-white/10 hover:bg-white/10 hover:border-[#5E6AD2]/50";
  };

  const getAddButtonStyles = () => {
    if (isSwiss) {
      return isSwissDark
        ? "bg-[#374151] text-[#9CA3AF] border-[#4B5563] border-dashed hover:border-[#F87171] hover:text-[#F87171]"
        : "bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB] border-dashed hover:border-[#E31837] hover:text-[#E31837]";
    }
    if (isConfetti) {
      return "bg-[#FFFDF5] text-[#64748B] border-[#1E293B] border-dashed hover:bg-[#34D399] hover:text-white";
    }
    if (isMinimalist) {
      return "bg-[#F2F2F2] text-[#666666] border-black border-dashed hover:bg-black hover:text-white";
    }
    if (isNapkin) {
      return "bg-[#fdfbf7] text-[#2d2d2d]/50 border-[#2d2d2d] border-dashed hover:bg-[#2d5da1] hover:text-white";
    }
    return "bg-white/5 text-white/40 border-white/20 border-dashed hover:bg-white/10 hover:text-white/80";
  };

  const borderRadius = isMinimalist ? "0" : isNapkin ? "8px" : isConfetti ? "9999px" : "6px";

  if (favorites.length === 0 && !isAdding) {
    // Show a subtle "save route" button when no favorites
    return (
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleAddFavorite}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-2 transition-all duration-150 ${getAddButtonStyles()}`}
          style={{ borderRadius }}
        >
          <Heart className="w-3 h-3" />
          <span>Save this route</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {/* Adding new favorite inline */}
      {isAdding && (
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Route name..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmAddFavorite();
              if (e.key === "Escape") setIsAdding(false);
            }}
            className={`flex-1 px-3 py-1.5 text-sm border-2 outline-none ${
              isSwissDark
                ? "bg-[#374151] border-[#F87171] text-[#F9FAFB]"
                : isSwiss
                ? "bg-white border-[#E31837] text-[#111827]"
                : isConfetti
                ? "bg-white border-[#8B5CF6] text-[#1E293B]"
                : isMinimalist
                ? "bg-white border-black text-black"
                : isNapkin
                ? "bg-white border-[#2d2d2d] text-[#2d2d2d]"
                : "bg-white/10 border-[#5E6AD2] text-white"
            }`}
            style={{ borderRadius }}
          />
          <button
            onClick={confirmAddFavorite}
            className={`px-3 py-1.5 text-xs font-medium border-2 transition-all ${getButtonStyles(true)}`}
            style={{ borderRadius }}
          >
            Save
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className={`p-1.5 border-2 transition-all ${getButtonStyles(false)}`}
            style={{ borderRadius }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Favorite route buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[10px] uppercase tracking-widest font-medium ${
          isSwissDark ? "text-[#9CA3AF]" : isSwiss ? "text-[#6B7280]" : isConfetti ? "text-[#64748B]" : isNapkin ? "text-[#2d2d2d]/50" : isMinimalist ? "text-[#666666]" : "text-white/40"
        }`}>
          Quick:
        </span>
        
        {favorites.map((favorite) => {
          const isActive = favorite.origin === currentOrigin && favorite.destination === currentDestination;
          return (
            <div key={favorite.id} className="relative group">
              <button
                onClick={() => handleSelectFavorite(favorite)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-2 transition-all duration-150 ${getButtonStyles(isActive)}`}
                style={{ borderRadius }}
              >
                <Star className={`w-3 h-3 ${isActive ? "fill-current" : ""}`} />
                <span>{favorite.name}</span>
              </button>
              {/* Remove button on hover */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFavorite(favorite.id);
                }}
                className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                  isSwiss
                    ? "bg-[#EF4444] text-white"
                    : isConfetti
                    ? "bg-[#F472B6] text-white border border-[#1E293B]"
                    : isMinimalist
                    ? "bg-black text-white"
                    : isNapkin
                    ? "bg-[#ff4d4d] text-white"
                    : "bg-rose-500 text-white"
                }`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}

        {/* Add button (if under max) */}
        {favorites.length < MAX_FAVORITES && !isAdding && (
          <button
            onClick={handleAddFavorite}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border-2 transition-all duration-150 ${getAddButtonStyles()}`}
            style={{ borderRadius }}
            title={isCurrentRouteFavorite ? "Current route already saved" : "Save current route"}
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
