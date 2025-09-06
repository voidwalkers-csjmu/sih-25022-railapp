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
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { simulateDisruptionImpact, DisruptionImpactOutput } from "@/ai/flows/disruption-impact-tool"
import { Loader2, Terminal } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Separator } from "../ui/separator"

const FormSchema = z.object({
  sectionU: z.string().min(2, { message: "Station code must be at least 2 characters." }),
  sectionV: z.string().min(2, { message: "Station code must be at least 2 characters." }),
  startTimeS: z.coerce.number().int().positive(),
  endTimeS: z.coerce.number().int().positive(),
  speedFactor: z.coerce.number().min(0).max(1),
})

export function DisruptionTool() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DisruptionImpactOutput | null>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      sectionU: "TK",
      sectionV: "ASK",
      startTimeS: 3000,
      endTimeS: 5000,
      speedFactor: 0.2,
    },
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const response = await simulateDisruptionImpact(data)
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
      <h3 className="font-headline text-lg font-semibold">Disruption Impact Tool</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex gap-2">
            <FormField
              control={form.control}
              name="sectionU"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From</FormLabel>
                  <FormControl>
                    <Input placeholder="SBC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sectionV"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To</FormLabel>
                  <FormControl>
                    <Input placeholder="YPR" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex gap-2">
             <FormField
              control={form.control}
              name="startTimeS"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start (s)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="endTimeS"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End (s)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="speedFactor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Speed Factor (0 to 1)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Analyze Impact
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
                <CardTitle>Analysis Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div>
                    <h4 className="font-semibold">Affected Trains</h4>
                    <p className="text-muted-foreground">{result.affectedTrains.join(', ')}</p>
                </div>
                 <Separator/>
                <div>
                    <h4 className="font-semibold">Estimated Delays</h4>
                    <ul className="list-disc pl-5 text-muted-foreground">
                        {Object.entries(result.estimatedDelays).map(([train, delay]) => (
                            <li key={train}>{train}: {delay} seconds</li>
                        ))}
                    </ul>
                </div>
                 <Separator/>
                <div>
                    <h4 className="font-semibold">Suggested Adjustments</h4>
                    <p className="text-muted-foreground">{result.suggestedAdjustments}</p>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  )
}
