"use client";

import React, { useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarInset,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Bot, LineChart, List, Wrench } from 'lucide-react';
import { useSimulation } from '@/hooks/use-simulation';
import SimulationMap from './map';
import SimulationControls from './controls';
import AnalyticsDashboard from './analytics';
import TrainDetailsPanel from './train-details';
import EventLog from './event-log';
import { DisruptionTool } from './disruption-tool';
import { PredictiveDelayTool } from './delay-predictor';

export function MainLayout() {
  const simulation = useSimulation();
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <SidebarProvider defaultOpen onOpenChange={setSidebarOpen}>
      <Sidebar
        variant="inset"
        collapsible="icon"
        className="border-sidebar-border"
      >
        <SidebarHeader>
          <div className="flex h-8 w-full items-center justify-between px-2">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
              <Bot className="size-5 text-primary" />
              <h2 className="font-headline text-lg font-medium">
                RailPulse AI
              </h2>
            </div>
            <SidebarTrigger />
          </div>
        </SidebarHeader>
        <SidebarContent asChild>
          <Tabs defaultValue="analytics" className="h-full w-full">
            <div className="p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:pt-2">
              <TabsList className="grid w-full grid-cols-3 group-data-[collapsible=icon]:grid-cols-1">
                <TabsTrigger value="analytics" className="group-data-[collapsible=icon]:h-8">
                  <LineChart className="group-data-[collapsible=icon]:size-4" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="logs" className="group-data-[collapsible=icon]:h-8">
                  <List className="group-data-[collapsible=icon]:size-4" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">Logs</span>
                </TabsTrigger>
                <TabsTrigger value="tools" className="group-data-[collapsible=icon]:h-8">
                  <Wrench className="group-data-[collapsible=icon]:size-4" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">Tools</span>
                </TabsTrigger>
              </TabsList>
            </div>
            <Separator className="group-data-[collapsible=icon]:hidden" />
            
            <TabsContent value="analytics" className="m-0 h-full">
               <AnalyticsDashboard trains={simulation.trains} time={simulation.time} />
            </TabsContent>

            <TabsContent value="logs" className="m-0">
               <EventLog events={simulation.events} />
            </TabsContent>
            
            <TabsContent value="tools" className="m-0">
                <SidebarGroup>
                    <DisruptionTool />
                    <Separator className="my-4" />
                    <PredictiveDelayTool trains={simulation.trains}/>
                </SidebarGroup>
            </TabsContent>

          </Tabs>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm md:h-[60px] md:px-6">
          <div className="flex items-center gap-3">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <path d="M18.5 3H5.5C4.67 3 4 3.67 4 4.5V17.5C4 18.33 4.67 19 5.5 19H18.5C19.33 19 20 18.33 20 17.5V4.5C20 3.67 19.33 3 18.5 3ZM7 16C6.17 16 5.5 15.33 5.5 14.5S6.17 13 7 13S8.5 13.67 8.5 14.5S7.83 16 7 16ZM17 16C16.17 16 15.5 15.33 15.5 14.5S16.17 13 17 13S18.5 13.67 18.5 14.5S17.83 16 17 16ZM19 10H5V5H19V10Z" fill="hsl(var(--primary))"/>
             </svg>
            <h1 className="font-headline text-xl font-bold tracking-tight">RailPulse</h1>
          </div>
          <div className='ml-auto'>
            <TrainDetailsPanel train={simulation.selectedTrain} onUpdateTrain={simulation.updateTrain} />
          </div>
        </header>
        
        <main className="flex-1 overflow-hidden relative">
          <SimulationMap 
            stations={simulation.stations}
            sections={simulation.sections}
            trains={simulation.trains}
            onSelectTrain={simulation.setSelectedTrain}
            selectedTrain={simulation.selectedTrain}
          />
        </main>
        
        <footer className="border-t">
          <SimulationControls 
            isRunning={simulation.isRunning}
            time={simulation.time}
            speed={simulation.speed}
            togglePlayPause={simulation.togglePlayPause}
            resetSimulation={simulation.resetSimulation}
            setSpeed={simulation.setSpeed}
          />
        </footer>

      </SidebarInset>
    </SidebarProvider>
  );
}
