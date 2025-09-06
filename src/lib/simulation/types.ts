export interface Disruption {
  section_u: string;
  section_v: string;
  start_time_s: number;
  end_time_s: number;
  speed_factor: number;
}

export interface Block {
  block_id: string;
  length_km: number;
  signal_state: 'green' | 'yellow' | 'red';
}

export interface Station {
  code: string;
  name: string;
  has_loop: boolean;
  num_loops: number;
  num_platforms: number;
  max_train_len_m: number;
  is_junction: boolean;
  dwell_mean_s: number;
  dwell_std_dev_s: number;
  occupied_platforms: string[];
}

export interface Section {
  u: string;
  v: string;
  line_type: string;
  length_km: number;
  vmax_kmph: number;
  signalling: string;
  gradient: number;
  occupied_by: string | null;
  original_vmax_kmph?: number;
  active_disruptions: Disruption[];
}

export interface Train {
  train_id: string;
  category: string;
  priority: number;
  vmax_kmph: number;
  acceleration_ms2: number;
  base_deceleration_ms2: number;
  length_m: number;
  route: string[];
  depart_time_s: number;
  delay_s: number;
  status: 'waiting' | 'running' | 'finished' | 'held';
  
  // Dynamic properties for simulation state
  current_speed_ms?: number;
  distance_on_section?: number;
  current_section_idx?: number;
  last_event_time?: number;
  location?: { type: 'station'; code: string } | { type: 'section'; u: string; v: string; progress: number };
}

export interface SimEvent {
  time: number;
  train_id: string;
  event: string;
  location: string;
  reason: string | null;
}
