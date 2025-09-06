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

const stationCoordinates: Record<string, { x: number; y: number }> = {
    SBC: { x: 15, y: 50 }, YPR: { x: 20, y: 45 }, TK: { x: 28, y: 37 },
    ASK: { x: 40, y: 28 }, RRB: { x: 50, y: 30 }, DVG: { x: 65, y: 35 },
    HRR: { x: 70, y: 38 }, RNR: { x: 75, y: 41 }, HVR: { x: 80, y: 45 },
    UBL: { x: 90, y: 55 }, DMM: { x: 25, y: 65 }, ATP: { x: 30, y: 75 },
    GTL: { x: 40, y: 85 }, HPT: { x: 50, y: 75 }, GDG: { x: 65, y: 65 },
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
  const stationElements = useMemo(() => {
    return Object.values(stations).map(station => {
      const pos = stationCoordinates[station.code];
      if (!pos) return null;
      return (
        <g key={station.code} transform={`translate(${pos.x * 10}, ${pos.y * 10})`}>
          <circle r="5" fill="hsl(var(--primary))" />
          <text x="8" y="4" className="text-xs font-semibold fill-foreground" >
            {station.code}
          </text>
        </g>
      );
    });
  }, [stations]);

  const sectionElements = useMemo(() => {
    const drawnSections = new Set<string>();
    return Object.values(sections).map(section => {
      const pos1 = stationCoordinates[section.u];
      const pos2 = stationCoordinates[section.v];
      const key1 = `${section.u}-${section.v}`;
      const key2 = `${section.v}-${section.u}`;
      
      if (!pos1 || !pos2 || drawnSections.has(key1) || drawnSections.has(key2)) return null;
      
      drawnSections.add(key1);
      
      const isSingle = section.line_type === 'single';

      return (
        <line
          key={key1}
          x1={pos1.x * 10}
          y1={pos1.y * 10}
          x2={pos2.x * 10}
          y2={pos2.y * 10}
          stroke={isSingle ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))"}
          strokeWidth="2"
          strokeDasharray={isSingle ? "4 2" : "none"}
        />
      );
    });
  }, [sections]);

  const trainElements = useMemo(() => {
    return trains.map(train => {
      if (!train.location) return null;

      let x = 0, y = 0;

      if (train.location.type === 'station') {
        const pos = stationCoordinates[train.location.code];
        if (!pos) return null;
        x = pos.x * 10;
        y = pos.y * 10;
      } else if (train.location.type === 'section') {
        const pos1 = stationCoordinates[train.location.u];
        const pos2 = stationCoordinates[train.location.v];
        if (!pos1 || !pos2) return null;
        const progress = train.location.progress || 0;
        x = pos1.x * 10 + (pos2.x * 10 - pos1.x * 10) * progress;
        y = pos1.y * 10 + (pos2.y * 10 - pos1.y * 10) * progress;
      }

      return <TrainMarker key={train.train_id} train={train} x={x} y={y} onSelectTrain={onSelectTrain} isSelected={selectedTrain?.train_id === train.train_id}/>;
    });
  }, [trains, onSelectTrain, selectedTrain]);

  return (
    <div className="w-full h-full bg-card rounded-lg overflow-hidden">
      <TooltipProvider>
        <svg width="100%" height="100%" viewBox="0 0 1000 1000" className='bg-grid-slate-100 dark:bg-grid-slate-900'>
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
