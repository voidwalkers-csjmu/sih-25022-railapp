'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Train, Station, Section, SimEvent } from '@/lib/simulation/types';

// A simple event queue implementation
class EventQueue {
  private queue: any[] = [];
  private eventCounter = 0;

  clear() {
    this.queue = [];
    this.eventCounter = 0;
  }

  push(time: number, event: string, train: Train, meta: any) {
    this.eventCounter++;
    this.queue.push({ time, id: this.eventCounter, event, train, meta });
    this.queue.sort((a, b) => a.time - b.time || a.id - b.id);
  }

  pop() {
    return this.queue.shift();
  }

  isEmpty() {
    return this.queue.length === 0;
  }

  get queueData() {
    return this.queue;
  }
}

export type SimulationState = {
  time: number;
  trains: Train[];
  events: SimEvent[];
  isRunning: boolean;
  speed: number;
  selectedTrain: Train | null;
};

export const useSimulation = () => {
  const [stations, setStations] = useState<Record<string, Station>>({});
  const [sections, setSections] = useState<Record<string, Section>>({});
  const [initialTrains, setInitialTrains] = useState<Train[]>([]);

  const [simulationState, setSimulationState] = useState<SimulationState>({
    time: 0,
    trains: [],
    events: [],
    isRunning: false,
    speed: 1,
    selectedTrain: null,
  });

  const eventQueue = useRef(new EventQueue());
  const simulationTimer = useRef<NodeJS.Timeout | null>(null);
  
  const stopSimulation = () => {
      if (simulationTimer.current) {
        clearInterval(simulationTimer.current);
        simulationTimer.current = null;
      }
      setSimulationState(prev => ({...prev, isRunning: false}));
  }

  const logEvent = (time: number, train_id: string, event_type: string, location: string, reason: string | null = null) => {
    setSimulationState(prevState => ({
      ...prevState,
      events: [{ time, train_id, event: event_type, location, reason }, ...prevState.events],
    }));
  };
  
  const resetSimulation = useCallback((newStations: Record<string, Station>, newSections: Record<string, Section>, newTrains: Train[]) => {
    stopSimulation();
    eventQueue.current.clear();
    
    const loadedTrains: Train[] = newTrains.map(t => ({
      ...t,
      status: 'waiting',
      delay_s: 0,
      current_speed_ms: 0,
      distance_on_section: 0,
      current_section_idx: 0,
      location: { type: 'station', code: t.route[0] },
    }));

    loadedTrains.forEach(train => {
      eventQueue.current.push(train.depart_time_s, 'depart', train, {});
    });

    setStations(newStations);
    setSections(newSections);
    setInitialTrains(newTrains);

    setSimulationState({
      time: 0,
      trains: loadedTrains,
      events: [{ time: 0, train_id: 'System', event: 'SIM_RESET', location: 'n/a', reason: 'Simulation reset to initial state.' }],
      isRunning: false,
      speed: 1,
      selectedTrain: null,
    });

  }, []);

  const loadDefaultData = useCallback(async () => {
    const stationsRes = await fetch('/data/stations.json');
    const stationsData: Station[] = await stationsRes.json();
    const stationsMap = stationsData.reduce((acc, st) => {
      acc[st.code] = { ...st, occupied_platforms: [] };
      return acc;
    }, {} as Record<string, Station>);

    const sectionsRes = await fetch('/data/sections.json');
    const sectionsData: Section[] = await sectionsRes.json();
    const sectionsMap = sectionsData.reduce((acc, sec) => {
      acc[`${sec.u}-${sec.v}`] = { ...sec, blocks: [], active_disruptions: [] };
      if (sec.line_type === 'double') {
          acc[`${sec.v}-${sec.u}`] = { ...sec, u: sec.v, v: sec.u, blocks: [], active_disruptions: [] };
      }
      return acc;
    }, {} as Record<string, Section>);

    const trainsRes = await fetch('/data/trains.json');
    const trainsData: Train[] = await trainsRes.json();
    
    resetSimulation(stationsMap, sectionsMap, trainsData);
  }, [resetSimulation]);
  
  useEffect(() => {
    loadDefaultData();
  }, [loadDefaultData]);


  const loadCustomData = useCallback(({ stations: stationsData, sections: sectionsData, trains: trainsData }: { stations: Station[], sections: Section[], trains: Train[]}) => {
    const stationsMap = stationsData.reduce((acc, st) => {
      acc[st.code] = { ...st, occupied_platforms: [] };
      return acc;
    }, {} as Record<string, Station>);
    
    const sectionsMap = sectionsData.reduce((acc, sec) => {
      acc[`${sec.u}-${sec.v}`] = { ...sec, blocks: [], active_disruptions: [] };
      if (sec.line_type === 'double') {
         acc[`${sec.v}-${sec.u}`] = { ...sec, u: sec.v, v: sec.u, blocks: [], active_disruptions: [] };
      }
      return acc;
    }, {} as Record<string, Section>);

    resetSimulation(stationsMap, sectionsMap, trainsData);
  }, [resetSimulation]);

  const resetToDefaultData = useCallback(() => {
    loadDefaultData();
  }, [loadDefaultData]);

  const processNextEvent = useCallback(() => {
    if (eventQueue.current.isEmpty()) {
      stopSimulation();
      logEvent(simulationState.time, 'System', 'SIM_END', 'n/a', 'Event queue is empty.');
      return;
    }

    const event = eventQueue.current.pop();
    if (!event) return;

    setSimulationState(prevState => {
      const updatedTrains = prevState.trains.map(t =>
        t.train_id === event.train.train_id ? { ...t, ...event.train } : t
      );
      
      return { ...prevState, time: event.time, trains: updatedTrains };
    });

    // Simplified event handlers
    switch (event.event) {
      case 'depart':
        handleDepart(event.train, event.time);
        break;
      case 'arrive_station':
        handleArriveStation(event.train, event.time);
        break;
      case 'arrive_final':
        handleArriveFinal(event.train, event.time);
        break;
    }
  }, [simulationState.time]);
  
  const handleDepart = (train: Train, time: number) => {
    logEvent(time, train.train_id, 'DEPART_JOURNEY', train.route[0]);
    train.status = 'running';
    train.current_section_idx = 0;
    const sectionIdx = train.current_section_idx;
    if (sectionIdx < train.route.length - 1) {
        const u = train.route[sectionIdx];
        const v = train.route[sectionIdx + 1];
        const sectionKey = `${u}-${v}`;
        const section = sections[sectionKey];
        if (section) {
            const travelTime = (section.length_km / (train.vmax_kmph * 0.8)) * 3600; // Simplified
            setSimulationState(prevState => {
                const updatedTrains = prevState.trains.map(t => {
                    if (t.train_id === train.train_id) {
                        return { ...t, status: 'running', current_section_idx: 0, location: { type: 'section', u, v, progress: 0 }};
                    }
                    return t;
                });
                return {...prevState, trains: updatedTrains};
            });
            eventQueue.current.push(time + travelTime, 'arrive_station', train, { departureTime: time });
        }
    }
  };

  const handleArriveStation = (train: Train, time: number) => {
    const sectionIdx = train.current_section_idx ?? 0;
    const stationCode = train.route[sectionIdx + 1];
    logEvent(time, train.train_id, 'ARRIVE_STATION', stationCode);
    
    train.current_section_idx = sectionIdx + 1;
    const nextSectionIdx = train.current_section_idx;
    
    setSimulationState(prevState => {
        const updatedTrains = prevState.trains.map(t => {
            if (t.train_id === train.train_id) {
                return { ...t, current_section_idx: nextSectionIdx, location: { type: 'station', code: stationCode }};
            }
            return t;
        });
        return {...prevState, trains: updatedTrains};
    });

    if (nextSectionIdx < train.route.length - 1) {
        const dwellTime = stations[stationCode]?.dwell_mean_s || 60;
        const departTime = time + dwellTime;
        const u = train.route[nextSectionIdx];
        const v = train.route[nextSectionIdx + 1];
        const sectionKey = `${u}-${v}`;
        const section = sections[sectionKey];
        if (section) {
            const travelTime = (section.length_km / (train.vmax_kmph * 0.8)) * 3600;
            logEvent(time, train.train_id, 'DEPART_STATION', u, `Dwell for ${dwellTime}s`);
            const nextEventType = nextSectionIdx + 1 === train.route.length - 1 ? 'arrive_final' : 'arrive_station';
            eventQueue.current.push(departTime + travelTime, nextEventType, train, { departureTime: departTime });
        }
    } else {
        eventQueue.current.push(time + 1, 'arrive_final', train, {});
    }
  };

  const handleArriveFinal = (train: Train, time: number) => {
    train.status = 'finished';
    const finalStation = train.route[train.route.length - 1];
    logEvent(time, train.train_id, 'ARRIVE_FINAL', finalStation);
    setSimulationState(prevState => {
        const updatedTrains = prevState.trains.map(t => {
            if (t.train_id === train.train_id) {
                return { ...t, status: 'finished', location: { type: 'station', code: finalStation } };
            }
            return t;
        });
        return { ...prevState, trains: updatedTrains };
    });
  };

  const runSimulationStep = useCallback(() => {
    const timeIncrement = 1 * simulationState.speed;
    const nextEventTime = eventQueue.current.isEmpty() ? Infinity : eventQueue.current.queueData[0].time;

    if (simulationState.time + timeIncrement >= nextEventTime) {
      processNextEvent();
    } else {
      setSimulationState(prevState => ({...prevState, time: prevState.time + timeIncrement}));
    }

    // Update train visual positions
     setSimulationState(prevState => {
        const updatedTrains = prevState.trains.map(t => {
            if (t.status === 'running' && t.current_section_idx != null) {
                const sectionIdx = t.current_section_idx;
                if (sectionIdx < t.route.length - 1) {
                    const u = t.route[sectionIdx];
                    const v = t.route[sectionIdx+1];
                    const sectionKey = `${u}-${v}`;
                    const section = sections[sectionKey];
                    if (section) {
                         const travelTime = (section.length_km / (t.vmax_kmph * 0.8)) * 3600;
                         // Find the departure event for the current section
                         const event = [...eventQueue.current.queueData, ...prevState.events].find(e => e.train?.train_id === t.train_id || e.train_id === t.train_id);
                         const departureTime = event?.meta?.departureTime || t.depart_time_s;
                         const progress = Math.min(1, (prevState.time - departureTime) / travelTime);
                         if (progress >= 0) {
                            return {...t, location: {type: 'section', u, v, progress}};
                         }
                    }
                }
            }
            return t;
        });
        return {...prevState, trains: updatedTrains};
    });

  }, [simulationState.speed, simulationState.time, processNextEvent, sections]);

  const togglePlayPause = useCallback(() => {
    setSimulationState(prevState => {
        const newIsRunning = !prevState.isRunning;
        if (newIsRunning) {
            if (simulationTimer.current) clearInterval(simulationTimer.current);
            simulationTimer.current = setInterval(runSimulationStep, 100);
            logEvent(prevState.time, 'System', 'SIM_START', 'n/a', null);
        } else {
            stopSimulation();
            logEvent(prevState.time, 'System', 'SIM_PAUSE', 'n/a', null);
        }
        return { ...prevState, isRunning: newIsRunning };
    });
  }, [runSimulationStep]);
  
  const setSpeed = (speed: number) => {
    setSimulationState(prevState => ({...prevState, speed}));
  };

  const setSelectedTrain = (train: Train | null) => {
     setSimulationState(prevState => ({ ...prevState, selectedTrain: train }));
  };

  const updateTrain = (trainId: string, updates: Partial<Train>) => {
    setSimulationState(prevState => ({
        ...prevState,
        trains: prevState.trains.map(t => t.train_id === trainId ? {...t, ...updates} : t)
    }));
    // This is a simplified update, for departure time changes, we should re-schedule in a real scenario
  };

  return {
    ...simulationState,
    stations,
    sections,
    togglePlayPause,
    resetSimulation: () => resetToDefaultData(),
    setSpeed,
    setSelectedTrain,
    updateTrain,
    loadCustomData,
    resetToDefaultData,
  };
};
