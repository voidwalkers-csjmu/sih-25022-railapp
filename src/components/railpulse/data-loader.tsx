// src/components/railpulse/data-loader.tsx
"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, FileJson, Trash2 } from 'lucide-react';
import { Separator } from '../ui/separator';

interface DataLoaderProps {
  onDataLoaded: (data: { stations: any[], sections: any[], trains: any[] }) => void;
  onResetToDefault: () => void;
}

export function DataLoader({ onDataLoaded, onResetToDefault }: DataLoaderProps) {
  const [stationFile, setStationFile] = useState<File | null>(null);
  const [sectionFile, setSectionFile] = useState<File | null>(null);
  const [trainFile, setTrainFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const stationRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLInputElement>(null);
  const trainRef = useRef<HTMLInputElement>(null);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: (file: File | null) => void) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const clearFiles = () => {
    setStationFile(null);
    setSectionFile(null);
    setTrainFile(null);
    if(stationRef.current) stationRef.current.value = "";
    if(sectionRef.current) sectionRef.current.value = "";
    if(trainRef.current) trainRef.current.value = "";
  }

  const handleLoadData = async () => {
    if (!stationFile || !sectionFile || !trainFile) {
      toast({
        title: "Missing Files",
        description: "Please select all three JSON files.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const stations = JSON.parse(await stationFile.text());
      const sections = JSON.parse(await sectionFile.text());
      const trains = JSON.parse(await trainFile.text());

      onDataLoaded({ stations, sections, trains });

      toast({
        title: "Success",
        description: "Custom simulation data loaded successfully.",
      });
      clearFiles();
    } catch (error) {
      console.error("Failed to load custom data:", error);
      toast({
        title: "Error Loading Data",
        description: "Failed to parse JSON files. Please check the file contents and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    onResetToDefault();
    clearFiles();
    toast({
        title: "Data Reset",
        description: "Simulation has been reset to the default data.",
    });
  }

  const FileInput = ({ label, file, onChange, inputRef }: { label: string, file: File | null, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, inputRef: React.RefObject<HTMLInputElement> }) => (
    <div className='space-y-2'>
        <Label>{label}</Label>
        {!file ? (
            <Label htmlFor={`file-${label}`} className='flex items-center gap-2 border-2 border-dashed border-muted-foreground/50 rounded-lg p-4 cursor-pointer hover:bg-muted'>
                <UploadCloud className='w-5 h-5 text-muted-foreground'/>
                <span className='text-sm text-muted-foreground'>Click to upload a JSON file</span>
                <Input id={`file-${label}`} type="file" accept=".json" onChange={onChange} className="hidden" ref={inputRef}/>
            </Label>
        ) : (
            <div className='flex items-center justify-between gap-2 border rounded-lg p-2 bg-muted/50'>
                <div className='flex items-center gap-2'>
                    <FileJson className='w-5 h-5 text-primary'/>
                    <span className='text-sm font-medium truncate'>{file.name}</span>
                </div>
            </div>
        )}
    </div>
  );

  return (
    <div className='h-full p-2 space-y-4'>
        <h3 className="font-headline text-lg font-semibold">Simulation Data</h3>
        <Card>
            <CardHeader>
                <CardTitle>Load Custom Data</CardTitle>
                <CardDescription>Upload your own JSON files for the simulation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <FileInput label="Stations File" file={stationFile} onChange={(e) => handleFileChange(e, setStationFile)} inputRef={stationRef} />
                <FileInput label="Sections File" file={sectionFile} onChange={(e) => handleFileChange(e, setSectionFile)} inputRef={sectionRef}/>
                <FileInput label="Trains File" file={trainFile} onChange={(e) => handleFileChange(e, setTrainFile)} inputRef={trainRef}/>

                <div className='flex gap-2 pt-2'>
                    <Button onClick={handleLoadData} disabled={loading || !stationFile || !sectionFile || !trainFile}>
                        {loading ? 'Loading...' : 'Load Custom Data'}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={clearFiles} disabled={!stationFile && !sectionFile && !trainFile}>
                        <Trash2 className='w-4 h-4'/>
                    </Button>
                </div>
            </CardContent>
        </Card>
        <Separator/>
         <Card>
            <CardHeader>
                <CardTitle>Default Data</CardTitle>
                <CardDescription>Reset the simulation to use the default built-in data set.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleReset} variant="outline">Reset to Default</Button>
            </CardContent>
        </Card>
    </div>
  );
}
