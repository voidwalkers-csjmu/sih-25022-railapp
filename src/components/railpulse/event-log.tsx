"use client";

import React, { useState, useMemo } from 'react';
import { SimEvent } from '@/lib/simulation/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatTime } from '@/lib/utils';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '../ui/button';

interface EventLogProps {
  events: SimEvent[];
}

const EventLog: React.FC<EventLogProps> = ({ events }) => {
  const [filter, setFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof SimEvent; direction: 'asc' | 'desc' } | null>({ key: 'time', direction: 'desc' });

  const sortedEvents = useMemo(() => {
    let sortableEvents = [...events];
    if (sortConfig !== null) {
      sortableEvents.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableEvents;
  }, [events, sortConfig]);

  const filteredEvents = useMemo(() => {
    return sortedEvents.filter(event =>
      event.train_id.toLowerCase().includes(filter.toLowerCase()) ||
      event.event.toLowerCase().includes(filter.toLowerCase()) ||
      event.location.toLowerCase().includes(filter.toLowerCase())
    );
  }, [sortedEvents, filter]);

  const requestSort = (key: keyof SimEvent) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: keyof SimEvent) => {
    if (!sortConfig || sortConfig.key !== key) {
        return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    }
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2">
        <Input
          placeholder="Filter logs..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full font-code"
        />
      </div>
      <ScrollArea className="flex-1">
        <Table className="font-code text-xs">
          <TableHeader className='sticky top-0 bg-background/95 backdrop-blur-sm'>
            <TableRow>
              <TableHead onClick={() => requestSort('time')}>
                <div className='flex items-center cursor-pointer'>Time {getSortIcon('time')}</div>
              </TableHead>
              <TableHead onClick={() => requestSort('train_id')}>
                 <div className='flex items-center cursor-pointer'>Train ID {getSortIcon('train_id')}</div>
              </TableHead>
              <TableHead onClick={() => requestSort('event')}>
                <div className='flex items-center cursor-pointer'>Event {getSortIcon('event')}</div>
              </TableHead>
              <TableHead onClick={() => requestSort('location')}>
                <div className='flex items-center cursor-pointer'>Location {getSortIcon('location')}</div>
              </TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.map((event, index) => (
              <TableRow key={index}>
                <TableCell>{formatTime(event.time)}</TableCell>
                <TableCell>{event.train_id}</TableCell>
                <TableCell>{event.event}</TableCell>
                <TableCell>{event.location}</TableCell>
                <TableCell>{event.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

export default EventLog;
