

import CaltrainDisplay from "@/components/CaltrainDisplay";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 py-10 px-4">
      <CaltrainDisplay />

      <footer className="mt-16 pb-8 text-center text-slate-500 text-sm max-w-4xl mx-auto">
        <p className="mb-2">
          Data provided by <a href="https://www.caltrain.com/developer-resources" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-300 underline">Caltrain GTFS API</a>
        </p>
        <p className="text-xs">
          TrackTrain is an independent application and is not affiliated with, endorsed by, or sponsored by Caltrain or the Peninsula Corridor Joint Powers Board.
          All Caltrain trademarks and copyrighted materials are property of their respective owners. Data provided "as is" without warranties.
        </p>
      </footer>
    </main>
  );
}

