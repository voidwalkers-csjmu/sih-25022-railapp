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

  push(time: number, event: string, trainId: string, meta: any) {
    this.eventCounter++;
    this.queue.push({ time, id: this.eventCounter, event, trainId, meta });
    this.queue.sort((a, b) => a.time - b.time || a.id - b.id);
  }

  pop() {
    return this.queue.shift();
  }

  isEmpty() {
    return this.queue.length === 0;
  }
  
  peek() {
    return this.queue.length > 0 ? this.queue[0] : null;
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
  
  const stateRef = useRef(simulationState);
  stateRef.current = simulationState;

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
      eventQueue.current.push(train.depart_time_s, 'depart', train.train_id, {});
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
      acc[`${sec.u}-${sec.v}`] = { ...sec, occupied_by: null, active_disruptions: [] };
      if (sec.line_type === 'double') {
          acc[`${sec.v}-${sec.u}`] = { ...sec, u: sec.v, v: sec.u, occupied_by: null, active_disruptions: [] };
      }
      return acc;
    }, {} as Record<string, Section>);

    const trainsRes = await fetch('/data/trains.json');
    const trainsData: Train[] = await trainsRes.json();
    
    resetSimulation(stationsMap, sectionsMap, trainsData);
  }, [resetSimulation]);
  
  useEffect(() => {
    loadDefaultData();
     return () => {
      if (simulationTimer.current) {
        clearInterval(simulationTimer.current);
      }
    };
  }, [loadDefaultData]);


  const loadCustomData = useCallback(({ stations: stationsData, sections: sectionsData, trains: trainsData }: { stations: Station[], sections: Section[], trains: Train[]}) => {
    const stationsMap = stationsData.reduce((acc, st) => {
      acc[st.code] = { ...st, occupied_platforms: [] };
      return acc;
    }, {} as Record<string, Station>);
    
    const sectionsMap = sectionsData.reduce((acc, sec) => {
      acc[`${sec.u}-${sec.v}`] = { ...sec, occupied_by: null, active_disruptions: [] };
      if (sec.line_type === 'double') {
         acc[`${sec.v}-${sec.u}`] = { ...sec, u: sec.v, v: sec.u, occupied_by: null, active_disruptions: [] };
      }
      return acc;
    }, {} as Record<string, Section>);

    resetSimulation(stationsMap, sectionsMap, trainsData);
  }, [resetSimulation]);

  const resetToDefaultData = useCallback(() => {
    loadDefaultData();
  }, [loadDefaultData]);

  const processEventsUpTo = (time: number) => {
    while (true) {
        const event = eventQueue.current.peek();
        if (!event || event.time > time) {
            break;
        }

        const train = stateRef.current.trains.find(t => t.train_id === event.trainId);
        if (!train) {
          eventQueue.current.pop();
          continue;
        };

        if (event.event === 'enter_section') {
            const { u, v } = event.meta;
            const sectionKey = `${u}-${v}`;
            const reverseSectionKey = `${v}-${u}`;
            
            const sectionIsOccupied = sections[sectionKey]?.occupied_by;
            const reverseIsOccupied = sections[reverseSectionKey]?.occupied_by;
            const isSingleLine = sections[sectionKey]?.line_type === 'single';

            if ((isSingleLine && (sectionIsOccupied || reverseIsOccupied)) || sectionIsOccupied) {
                event.time = time + 10; // Re-queue for 10s later
                eventQueue.current.queue.sort((a, b) => a.time - b.time || a.id - b.id);
                continue; 
            }
        }
        
        eventQueue.current.pop();

        switch (event.event) {
            case 'depart':
                handleDepart(train, event.time);
                break;
            case 'enter_section':
                handleEnterSection(train, event.time, event.meta.u, event.meta.v);
                break;
            case 'arrive_station':
                handleArriveStation(train, event.time);
                break;
        }
    }
  };
  
  const handleDepart = (train: Train, time: number) => {
    logEvent(time, train.train_id, 'DEPART_JOURNEY', train.route[0]);
    const u = train.route[0];
    const v = train.route[1];
    eventQueue.current.push(time, 'enter_section', train.train_id, { u, v });
  };

  const handleEnterSection = (train: Train, time: number, u: string, v: string) => {
    const sectionKey = `${u}-${v}`;
    const section = sections[sectionKey];
    if (!section) return;

    sections[sectionKey].occupied_by = train.train_id;

    logEvent(time, train.train_id, 'ENTER_SECTION', `${u}->${v}`);

    const travelTime = (section.length_km / train.vmax_kmph) * 3600 * 1.2; // Add 20% buffer
    const arrivalTime = time + travelTime;
    
    setSimulationState(prevState => ({
        ...prevState,
        trains: prevState.trains.map(t => t.train_id === train.train_id ? {
            ...t,
            status: 'running',
            location: { type: 'section', u, v, progress: 0 },
            current_speed_ms: train.vmax_kmph / 3.6,
            last_event_time: time,
        } : t),
    }));

    eventQueue.current.push(arrivalTime, 'arrive_station', train.train_id, {u, v});
  };

  const handleArriveStation = (train: Train, time: number, u_from?: string, v_from?: string) => {
    const currentSectionIdx = train.current_section_idx || 0;
    const stationCode = train.route[currentSectionIdx + 1];

    if (train.location?.type === 'section') {
        const sectionKey = `${train.location.u}-${train.location.v}`;
        if (sections[sectionKey]) {
            sections[sectionKey].occupied_by = null;
        }
    }

    logEvent(time, train.train_id, 'ARRIVE_STATION', stationCode);

    const isFinalStation = (currentSectionIdx + 1) === train.route.length - 1;

    setSimulationState(prevState => ({
        ...prevState,
        trains: prevState.trains.map(t => t.train_id === train.train_id ? {
            ...t,
            status: isFinalStation ? 'finished' : 'running',
            location: { type: 'station', code: stationCode },
            current_section_idx: currentSectionIdx + 1,
            current_speed_ms: 0,
            last_event_time: time,
        } : t),
    }));

    if (isFinalStation) {
        logEvent(time, train.train_id, 'ARRIVE_FINAL', stationCode);
    } else {
        const dwellTime = stations[stationCode]?.dwell_mean_s || 60;
        const departTime = time + dwellTime;
        const u = train.route[currentSectionIdx + 1];
        const v = train.route[currentSectionIdx + 2];
        logEvent(time, train.train_id, 'DEPART_STATION', u, `Dwell for ${dwellTime}s`);
        eventQueue.current.push(departTime, 'enter_section', train.train_id, { u, v });
    }
  };

  const runSimulationStep = useCallback(() => {
    const currentTime = stateRef.current.time;
    const speed = stateRef.current.speed;
    const newTime = currentTime + (1 * speed);
    
    processEventsUpTo(newTime);
    
    setSimulationState(prevState => {
        const updatedTrains = prevState.trains.map(t => {
            if (t.status === 'running' && t.location?.type === 'section') {
                const sectionKey = `${t.location.u}-${t.location.v}`;
                const section = sections[sectionKey];
                if (section) {
                    const travelTime = (section.length_km / t.vmax_kmph) * 3600 * 1.2;
                    const timeElapsed = newTime - (t.last_event_time || 0);
                    const progress = Math.min(1, timeElapsed / travelTime);
                    return { ...t, location: { ...t.location, progress } };
                }
            }
            return t;
        });

        return { ...prevState, time: newTime, trains: updatedTrains };
    });
  }, [sections]);

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
