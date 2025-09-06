"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RefreshCw, Forward, Rabbit, Turtle } from 'lucide-react';
import { formatTime } from '@/lib/utils';

interface SimulationControlsProps {
  isRunning: boolean;
  time: number;
  speed: number;
  togglePlayPause: () => void;
  resetSimulation: () => void;
  setSpeed: (speed: number) => void;
}

const SimulationControls: React.FC<SimulationControlsProps> = ({
  isRunning,
  time,
  speed,
  togglePlayPause,
  resetSimulation,
  setSpeed,
}) => {
  return (
    <div className="flex h-16 items-center justify-between gap-4 bg-background/95 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={togglePlayPause}>
          {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={resetSimulation}>
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-4">
          <div className="font-mono text-lg font-semibold w-32 text-center">
            {formatTime(time)}
          </div>
        </div>
      </div>
      <div className="flex w-48 items-center gap-4">
        <Turtle className="h-5 w-5 text-muted-foreground" />
        <Slider
          defaultValue={[1]}
          min={1}
          max={100}
          step={1}
          value={[speed]}
          onValueChange={(value) => setSpeed(value[0])}
        />
        <Rabbit className="h-5 w-5 text-muted-foreground" />
      </div>
    </div>
  );
};

export default SimulationControls;
