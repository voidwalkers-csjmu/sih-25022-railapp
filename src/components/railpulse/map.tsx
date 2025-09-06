"use client";

import React, { useMemo } from 'react';
import { Train, Station, Section } from '@/lib/simulation/types';
import { TrainIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SimulationMapProps {
  stations: Record<string, Station>;
  sections: Record<string, Section>;
  trains: Train[];
  onSelectTrain: (train: Train) => void;
  selectedTrain: Train | null;
}

const stationCoordinates: Record<string, { lat: number; lon: number }> = {
    SBC: { lat: 12.9767, lon: 77.5667 }, YPR: { lat: 13.0234, lon: 77.5516 }, TK: { lat: 13.3396, lon: 77.1009 },
    ASK: { lat: 13.3155, lon: 76.2585 }, RRB: { lat: 13.6069, lon: 75.9722 }, DVG: { lat: 14.4644, lon: 75.9218 },
    HRR: { lat: 14.5150, lon: 75.8033 }, RNR: { lat: 14.6186, lon: 75.6247 }, HVR: { lat: 14.7937, lon: 75.4018 },
    UBL: { lat: 15.3535, lon: 75.1436 }, DMM: { lat: 14.4144, lon: 77.7214 }, ATP: { lat: 14.6816, lon: 77.6006 },
    GTL: { lat: 15.1764, lon: 77.3653 }, HPT: { lat: 15.2644, lon: 76.3984 }, GDG: { lat: 15.4224, lon: 75.6262 },
};

const TrainMarker = ({ train, x, y, onSelectTrain, isSelected }: { train: Train; x: number; y: number; onSelectTrain: (train: Train) => void; isSelected: boolean }) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <g
                transform={`translate(${x}, ${y})`}
                onClick={() => onSelectTrain(train)}
                className="cursor-pointer"
            >
                <circle r="12" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="2" />
                <TrainIcon
                    className={cn(
                        "text-primary transition-colors",
                        isSelected && "text-accent-foreground",
                    )}
                    style={{
                        transform: 'translate(-8px, -8px)',
                        width: '16px',
                        height: '16px',
                    }}
                    fill={isSelected ? 'hsl(var(--accent))' : 'transparent'}
                />
            </g>
        </TooltipTrigger>
        <TooltipContent>
            <p className="font-bold">{train.train_id}</p>
            <p>Status: {train.status}</p>
            <p>Speed: {(train.current_speed_ms || 0 * 3.6).toFixed(1)} km/h</p>
        </TooltipContent>
    </Tooltip>
);


const SimulationMap: React.FC<SimulationMapProps> = ({ stations, sections, trains, onSelectTrain, selectedTrain }) => {
  const { stationElements, sectionElements, trainElements, viewBox } = useMemo(() => {
    const coords = Object.values(stationCoordinates);
    if (coords.length === 0) {
      return { stationElements: [], sectionElements: [], trainElements: [], viewBox: "0 0 1000 1000" };
    }

    const minLat = Math.min(...coords.map(c => c.lat));
    const maxLat = Math.max(...coords.map(c => c.lat));
    const minLon = Math.min(...coords.map(c => c.lon));
    const maxLon = Math.max(...coords.map(c => c.lon));

    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;

    const width = 1000;
    const height = 1000;
    const padding = 50;

    const getPosition = (lat: number, lon: number) => {
      const x = padding + ((lon - minLon) / lonRange) * (width - 2 * padding);
      const y = padding + ((maxLat - lat) / latRange) * (height - 2 * padding);
      return { x, y };
    };

    const stationPositions: Record<string, { x: number; y: number }> = {};
    Object.keys(stationCoordinates).forEach(code => {
      const { lat, lon } = stationCoordinates[code];
      stationPositions[code] = getPosition(lat, lon);
    });
    
    const stationElements = Object.values(stations).map(station => {
      const pos = stationPositions[station.code];
      if (!pos) return null;
      return (
        <g key={station.code} transform={`translate(${pos.x}, ${pos.y})`}>
          <circle r="5" fill="hsl(var(--primary))" />
          <text x="8" y="4" className="text-xs font-semibold fill-foreground" >
            {station.code}
          </text>
        </g>
      );
    });

    const drawnSections = new Set<string>();
    const sectionElements = Object.values(sections).map(section => {
      const pos1 = stationPositions[section.u];
      const pos2 = stationPositions[section.v];
      const key1 = `${section.u}-${section.v}`;
      const key2 = `${section.v}-${section.u}`;
      
      if (!pos1 || !pos2 || drawnSections.has(key1) || drawnSections.has(key2)) return null;
      
      drawnSections.add(key1);
      
      const isSingle = section.line_type === 'single';

      return (
        <line
          key={key1}
          x1={pos1.x}
          y1={pos1.y}
          x2={pos2.x}
          y2={pos2.y}
          stroke={isSingle ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))"}
          strokeWidth="2"
          strokeDasharray={isSingle ? "4 2" : "none"}
        />
      );
    });

    const trainElements = trains.map(train => {
      if (!train.location) return null;

      let x = 0, y = 0;

      if (train.location.type === 'station') {
        const pos = stationPositions[train.location.code];
        if (!pos) return null;
        x = pos.x;
        y = pos.y;
      } else if (train.location.type === 'section') {
        const pos1 = stationPositions[train.location.u];
        const pos2 = stationPositions[train.location.v];
        if (!pos1 || !pos2) return null;
        const progress = train.location.progress || 0;
        x = pos1.x + (pos2.x - pos1.x) * progress;
        y = pos1.y + (pos2.y - pos1.y) * progress;
      }

      return <TrainMarker key={train.train_id} train={train} x={x} y={y} onSelectTrain={onSelectTrain} isSelected={selectedTrain?.train_id === train.train_id}/>;
    });

    return { stationElements, sectionElements, trainElements, viewBox: `0 0 ${width} ${height}` };

  }, [stations, sections, trains, onSelectTrain, selectedTrain]);

  return (
    <div className="w-full h-full bg-card rounded-lg overflow-hidden">
      <TooltipProvider>
        <svg width="100%" height="100%" viewBox={viewBox} className='bg-grid-slate-100 dark:bg-grid-slate-900'>
            <rect width="100%" height="100%" fill="hsl(var(--background))" />
            <g>{sectionElements}</g>
            <g>{stationElements}</g>
            <g>{trainElements}</g>
        </svg>
      </TooltipProvider>
    </div>
  );
};

export default SimulationMap;
