"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Star, Plus, X, Heart } from "lucide-react";
import { Theme, themes, ThemeName, getBorderRadius } from "@/lib/themes";

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
  theme: Theme;
  showFeedback: (message: string) => void;
}

const MAX_FAVORITES = 3;
const STORAGE_KEY = "favoriteRoutes";

// Generate a short default name for a route
function generateRouteName(origin: string, destination: string): string {
  const getAbbr = (name: string) => {
    const abbrs: Record<string, string> = {
      "San Francisco": "SF", "San Jose Diridon": "SJ", "Palo Alto": "PA",
      "Mountain View": "MV", "Sunnyvale": "SV", "Redwood City": "RWC",
      "Millbrae": "MB", "Hillsdale": "HS", "San Mateo": "SM",
      "Menlo Park": "MP", "Santa Clara": "SC", "California Avenue": "Cal Ave",
    };
    return abbrs[name] || name.split(" ").map(w => w[0]).join("");
  };
  return `${getAbbr(origin)} → ${getAbbr(destination)}`;
}

export default function FavoriteRoutes({
  currentOrigin,
  currentDestination,
  onSelectRoute,
  theme,
  showFeedback,
}: FavoriteRoutesProps) {
  const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const borderRadius = getBorderRadius(theme);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setFavorites(JSON.parse(saved));
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

  const isCurrentRouteFavorite = favorites.some(
    f => f.origin === currentOrigin && f.destination === currentDestination
  );

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
    setNewName(generateRouteName(currentOrigin, currentDestination));
    setIsAdding(true);
  }, [favorites.length, isCurrentRouteFavorite, currentOrigin, currentDestination, showFeedback]);

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

  const handleRemoveFavorite = useCallback((id: string) => {
    const favorite = favorites.find(f => f.id === id);
    saveFavorites(favorites.filter(f => f.id !== id));
    showFeedback(`Removed "${favorite?.name}"`);
  }, [favorites, saveFavorites, showFeedback]);

  const handleSelectFavorite = useCallback((favorite: FavoriteRoute) => {
    onSelectRoute(favorite.origin, favorite.destination);
    showFeedback(`Switched to ${favorite.name}`);
  }, [onSelectRoute, showFeedback]);

  // Get button styles using theme object
  const getButtonStyles = (isActive: boolean) => {
    const { raw } = theme;
    if (isActive) {
      return `bg-[${raw.accent.primary}] text-white border-[${raw.accent.primary}] ${theme.classes.shadow}`;
    }
    return `bg-[${raw.bg.card}] ${theme.classes.textPrimary} border-[${raw.border.primary}] hover:border-[${raw.accent.primary}] hover:${theme.classes.textAccent}`;
  };

  const getAddButtonStyles = () => {
    const { raw } = theme;
    return `bg-[${raw.bg.secondary}] ${theme.classes.textMuted} border-[${raw.border.secondary}] border-dashed hover:border-[${raw.accent.primary}] hover:${theme.classes.textAccent}`;
  };

  if (favorites.length === 0 && !isAdding) {
    return (
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleAddFavorite}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-2 transition-all duration-150 ${theme.classes.buttonGhost}`}
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
            className={`flex-1 px-3 py-1.5 text-sm border-2 outline-none ${theme.classes.input}`}
            style={{ borderRadius, backgroundColor: theme.raw.bg.card, color: theme.raw.text.primary, borderColor: theme.raw.accent.primary }}
          />
          <button
            onClick={confirmAddFavorite}
            className={`px-3 py-1.5 text-xs font-medium transition-all ${theme.classes.buttonPrimary}`}
            style={{ borderRadius }}
          >
            Save
          </button>
          <button
            onClick={() => setIsAdding(false)}
            className={`p-1.5 transition-all ${theme.classes.buttonSecondary}`}
            style={{ borderRadius }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[10px] uppercase tracking-widest font-medium ${theme.classes.textMuted}`}>
          Quick:
        </span>
        
        {favorites.map((favorite) => {
          const isActive = favorite.origin === currentOrigin && favorite.destination === currentDestination;
          return (
            <div key={favorite.id} className="relative group">
              <button
                onClick={() => handleSelectFavorite(favorite)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-2 transition-all duration-150`}
                style={{ 
                  borderRadius,
                  backgroundColor: isActive ? theme.raw.accent.primary : theme.raw.bg.card,
                  color: isActive ? '#FFFFFF' : theme.raw.text.primary,
                  borderColor: isActive ? theme.raw.accent.primary : theme.raw.border.primary,
                }}
              >
                <Star className={`w-3 h-3 ${isActive ? "fill-current" : ""}`} />
                <span>{favorite.name}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveFavorite(favorite.id); }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: theme.raw.accent.error, color: '#FFFFFF' }}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}

        {favorites.length < MAX_FAVORITES && !isAdding && (
          <button
            onClick={handleAddFavorite}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border-2 border-dashed transition-all duration-150 ${theme.classes.buttonGhost}`}
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
