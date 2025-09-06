"use client";

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Train } from '@/lib/simulation/types';
import { Separator } from '@/components/ui/separator';

interface TrainDetailsPanelProps {
  train: Train | null;
  onUpdateTrain: (trainId: string, updates: Partial<Train>) => void;
}

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between items-center">
        <Label className="text-muted-foreground">{label}</Label>
        <span className="font-medium">{value}</span>
    </div>
);

const TrainDetailsPanel: React.FC<TrainDetailsPanelProps> = ({ train, onUpdateTrain }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [departureTime, setDepartureTime] = useState(train?.depart_time_s || 0);

  useEffect(() => {
    if (train) {
      setDepartureTime(train.depart_time_s);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [train]);

  const handleSave = () => {
    if (train) {
      onUpdateTrain(train.train_id, { depart_time_s: Number(departureTime) });
      setIsOpen(false);
    }
  }

  if (!train) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="font-headline">Train Details: {train.train_id}</SheetTitle>
          <SheetDescription>
            Category: <span className="font-semibold">{train.category}</span>, Priority: <span className="font-semibold">{train.priority}</span>
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-3">
          <DetailItem label="Status" value={train.status} />
          <DetailItem label="Max Speed" value={`${train.vmax_kmph} km/h`} />
          <DetailItem label="Length" value={`${train.length_m}m`} />
          <DetailItem label="Acceleration" value={`${train.acceleration_ms2} m/s²`} />
          <DetailItem label="Deceleration" value={`${train.base_deceleration_ms2} m/s²`} />
          <Separator />
          <div className="space-y-2">
            <Label>Route</Label>
            <p className="text-sm text-muted-foreground break-words">{train.route.join(' → ')}</p>
          </div>
          <Separator />
           <div className="space-y-2">
              <Label htmlFor="departure-time">Scheduled Departure (seconds)</Label>
              <Input
                id="departure-time"
                type="number"
                value={departureTime}
                onChange={(e) => setDepartureTime(Number(e.target.value))}
              />
            </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
          <Button onClick={handleSave}>Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default TrainDetailsPanel;
