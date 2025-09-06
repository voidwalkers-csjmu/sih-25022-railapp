"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { predictDelay, PredictiveDelayOutput } from "@/ai/flows/predictive-delay-analysis"
import { Loader2, Terminal } from "lucide-react"
import type { Train } from "@/lib/simulation/types"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Separator } from "../ui/separator"
import { formatTime } from "@/lib/utils"

const FormSchema = z.object({
  trainId: z.string({
    required_error: "Please select a train.",
  }),
})

interface PredictiveDelayToolProps {
    trains: Train[];
}

export function PredictiveDelayTool({ trains }: PredictiveDelayToolProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PredictiveDelayOutput | null>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setLoading(true)
    setResult(null)
    setError(null)
    const train = trains.find(t => t.train_id === data.trainId);
    if (!train) {
        setError("Selected train not found.");
        setLoading(false);
        return;
    }

    const input = {
      trainId: train.train_id,
      currentLocation: train.location?.type === 'station' ? train.location.code : `${train.location?.u}-${train.location?.v}`,
      routeSoFar: train.route.slice(0, (train.current_section_idx || 0) + 1).join('|'),
      scheduledArrivalTime: train.depart_time_s + 7200, // Placeholder
      historicalDataSummary: 'Average delays of 5-10 minutes on ASK-TK section during peak hours.',
      realTimeEvents: 'No major disruptions reported. Minor congestion near YPR.',
    };

    try {
      const response = await predictDelay(input)
      setResult(response)
    } catch (e) {
      setError("An error occurred while running the analysis.")
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-2 space-y-4">
      <h3 className="font-headline text-lg font-semibold">Predictive Delay Tool</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="trainId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Train</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a running train" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {trains.filter(t => t.status === 'running').map(train => (
                        <SelectItem key={train.train_id} value={train.train_id}>{train.train_id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Predict Delay
          </Button>
        </form>
      </Form>
      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {result && (
        <Card>
            <CardHeader>
                <CardTitle>Prediction Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-semibold capitalize">{result.confidenceLevel}</span>
                </div>
                 <Separator/>
                <div>
                    <h4 className="font-semibold">Predicted Delay</h4>
                    <p className="text-muted-foreground">{result.predictedDelaySeconds} seconds</p>
                </div>
                 <Separator/>
                <div>
                    <h4 className="font-semibold">Estimated Arrival Time</h4>
                    <p className="text-muted-foreground">{formatTime(result.estimatedArrivalTime)}</p>
                </div>
                 <Separator/>
                <div>
                    <h4 className="font-semibold">Likely Bottlenecks</h4>
                    <p className="text-muted-foreground">{result.likelyBottleneckSections.replace(/\|/g, ', ')}</p>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  )
}
