'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Train, Station, Section, SimEvent } from '@/lib/simulation/types';

// A simple event queue implementation
class EventQueue {
  private queue: any[] = [];
  private eventCounter = 0;

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

  const logEvent = (train_id: string, event_type: string, location: string, reason: string | null = null) => {
    setSimulationState(prevState => ({
      ...prevState,
      events: [{ time: prevState.time, train_id, event: event_type, location, reason }, ...prevState.events],
    }));
  };
  
  const resetSimulation = useCallback(() => {
    if (simulationTimer.current) {
        clearInterval(simulationTimer.current);
    }
    eventQueue.current = new EventQueue();
    const loadedTrains: Train[] = initialTrains.map(t => ({
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

    setSimulationState({
      time: 0,
      trains: loadedTrains,
      events: [{ time: 0, train_id: 'System', event: 'SIM_RESET', location: 'n/a', reason: 'Simulation reset to initial state.' }],
      isRunning: false,
      speed: 1,
      selectedTrain: null,
    });

  }, [initialTrains]);

  useEffect(() => {
    const loadData = async () => {
      const stationsRes = await fetch('/data/stations.json');
      const stationsData: Station[] = await stationsRes.json();
      const stationsMap = stationsData.reduce((acc, st) => {
        acc[st.code] = { ...st, occupied_platforms: [] };
        return acc;
      }, {} as Record<string, Station>);
      setStations(stationsMap);

      const sectionsRes = await fetch('/data/sections.json');
      const sectionsData: Section[] = await sectionsRes.json();
      const sectionsMap = sectionsData.reduce((acc, sec) => {
        acc[`${sec.u}-${sec.v}`] = { ...sec, blocks: [], active_disruptions: [] };
        if (sec.line_type === 'double') {
           acc[`${sec.v}-${sec.u}`] = { ...sec, u: sec.v, v: sec.u, blocks: [], active_disruptions: [] };
        }
        return acc;
      }, {} as Record<string, Section>);
      setSections(sectionsMap);

      const trainsRes = await fetch('/data/trains.json');
      const trainsData: Train[] = await trainsRes.json();
      setInitialTrains(trainsData);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (initialTrains.length > 0) {
      resetSimulation();
    }
  }, [initialTrains, resetSimulation]);


  const processNextEvent = useCallback(() => {
    if (eventQueue.current.isEmpty()) {
      setSimulationState(prevState => ({ ...prevState, isRunning: false }));
      if (simulationTimer.current) clearInterval(simulationTimer.current);
      logEvent('System', 'SIM_END', 'n/a', 'Event queue is empty.');
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
        handleDepart(event.train);
        break;
      case 'arrive_station':
        handleArriveStation(event.train);
        break;
      case 'arrive_final':
        handleArriveFinal(event.train);
        break;
    }
  }, []);
  
  const handleDepart = (train: Train) => {
    logEvent(train.train_id, 'DEPART_JOURNEY', train.route[0]);
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
            eventQueue.current.push(simulationState.time + travelTime, 'arrive_station', train, {});
        }
    }
  };

  const handleArriveStation = (train: Train) => {
    const sectionIdx = train.current_section_idx ?? 0;
    const stationCode = train.route[sectionIdx + 1];
    logEvent(train.train_id, 'ARRIVE_STATION', stationCode);
    
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
        const departTime = simulationState.time + dwellTime;
        const u = train.route[nextSectionIdx];
        const v = train.route[nextSectionIdx + 1];
        const sectionKey = `${u}-${v}`;
        const section = sections[sectionKey];
        if (section) {
            const travelTime = (section.length_km / (train.vmax_kmph * 0.8)) * 3600;
            logEvent(train.train_id, 'DEPART_STATION', u, `Dwell for ${dwellTime}s`);
            eventQueue.current.push(departTime + travelTime, nextSectionIdx + 1 === train.route.length - 1 ? 'arrive_final' : 'arrive_station', train, {});
        }
    } else {
        eventQueue.current.push(simulationState.time + 1, 'arrive_final', train, {});
    }
  };

  const handleArriveFinal = (train: Train) => {
    train.status = 'finished';
    const finalStation = train.route[train.route.length - 1];
    logEvent(train.train_id, 'ARRIVE_FINAL', finalStation);
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
    const nextEventTime = eventQueue.current.isEmpty() ? Infinity : eventQueue.current.queue[0].time;

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
                         const lastEvent = eventQueue.current.queue.find(e => e.train.train_id === t.train_id);
                         const departureTime = (lastEvent?.time - travelTime) || prevState.time;
                         const progress = Math.min(1, (prevState.time - departureTime) / travelTime);
                         return {...t, location: {type: 'section', u, v, progress}};
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
            logEvent('System', 'SIM_START', 'n/a', null);
        } else {
            if (simulationTimer.current) clearInterval(simulationTimer.current);
            simulationTimer.current = null;
            logEvent('System', 'SIM_PAUSE', 'n/a', null);
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
    resetSimulation,
    setSpeed,
    setSelectedTrain,
    updateTrain,
  };
};
