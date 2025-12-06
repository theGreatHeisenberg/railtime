import { Suspense } from "react";
import CleanJourneyView from "@/components/CleanJourneyView";

// Loading fallback for Suspense boundary (required for useSearchParams)
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#E31837] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#6B7280] text-sm">Loading RailTime...</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CleanJourneyView />
    </Suspense>
  );
}
