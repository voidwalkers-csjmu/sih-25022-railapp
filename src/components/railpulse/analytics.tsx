"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Train } from '@/lib/simulation/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChartTooltipContent,
  ChartContainer
} from "@/components/ui/chart"

interface AnalyticsDashboardProps {
  trains: Train[];
  time: number;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ trains, time }) => {
  const finishedTrains = useMemo(() => trains.filter(t => t.status === 'finished'), [trains]);

  const averageDelay = useMemo(() => {
    if (finishedTrains.length === 0) return 0;
    const totalDelay = finishedTrains.reduce((sum, train) => sum + train.delay_s, 0);
    return totalDelay / finishedTrains.length;
  }, [finishedTrains]);

  const throughput = useMemo(() => {
    if (time === 0) return 0;
    return (finishedTrains.length * 3600) / time;
  }, [finishedTrains.length, time]);

  const chartData = useMemo(() => {
    return finishedTrains.map(train => ({
      name: train.train_id,
      delay: train.delay_s,
    })).sort((a,b) => b.delay - a.delay);
  }, [finishedTrains]);

  const chartConfig = {
    delay: {
      label: "Delay (s)",
      color: "hsl(var(--chart-1))",
    },
  }

  return (
    <ScrollArea className="h-[calc(100vh-150px)]">
      <div className="p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Delay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageDelay.toFixed(1)}s</div>
              <p className="text-xs text-muted-foreground">Across all finished trains</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{throughput.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Trains per hour</p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Delay by Train</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={chartData} accessibilityLayer>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Legend />
                <Bar dataKey="delay" fill="var(--color-delay)" radius={4} />
              </BarChart>
            </ChartContainer>
             ) : (
                <div className="flex items-center justify-center h-[300px]">
                    <p className="text-muted-foreground">No finished trains to display data for.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};

export default AnalyticsDashboard;
