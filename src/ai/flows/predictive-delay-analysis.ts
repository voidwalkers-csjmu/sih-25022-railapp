// predictive-delay-analysis.ts
'use server';

/**
 * @fileOverview This file defines the Genkit flow for predictive delay analysis in the RailPulse application.
 *
 * - predictDelay - A function that takes real-time train data and historical data to predict potential delays.
 * - PredictiveDelayInput - The input type for the predictDelay function.
 * - PredictiveDelayOutput - The return type for the predictDelay function, providing delay predictions and bottleneck sections.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictiveDelayInputSchema = z.object({
  trainId: z.string().describe('The ID of the train for which to predict delays.'),
  currentLocation: z.string().describe('The current location of the train (e.g., station code).'),
  routeSoFar: z.string().describe('The route the train has taken so far, as a pipe-separated string (e.g., SBC|YPR|TK).'),
  scheduledArrivalTime: z.number().describe('The scheduled arrival time in seconds since the start of the simulation.'),
  historicalDataSummary: z
    .string()
    .describe(
      'A summary of historical simulation data, including average delays on each section of the route.'
    ),
  realTimeEvents: z
    .string()
    .describe(
      'Real-time events in the simulation, such as disruptions or congestion, summarized as a string.'
    ),
});
export type PredictiveDelayInput = z.infer<typeof PredictiveDelayInputSchema>;

const PredictiveDelayOutputSchema = z.object({
  predictedDelaySeconds: z
    .number()
    .describe('The predicted delay in seconds, considering real-time events and historical data.'),
  estimatedArrivalTime: z
    .number()
    .describe('The estimated arrival time in seconds, after considering the predicted delay.'),
  likelyBottleneckSections: z
    .string()
    .describe(
      'A pipe-separated list of section (u->v) that are likely to cause bottlenecks (e.g., SBC->YPR|YPR->TK).'
    ),
  confidenceLevel: z
    .string()
    .describe('The confidence level of the delay prediction (e.g., high, medium, low).'),
});
export type PredictiveDelayOutput = z.infer<typeof PredictiveDelayOutputSchema>;

export async function predictDelay(input: PredictiveDelayInput): Promise<PredictiveDelayOutput> {
  return predictiveDelayFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictDelayPrompt',
  input: {schema: PredictiveDelayInputSchema},
  output: {schema: PredictiveDelayOutputSchema},
  prompt: `You are an expert in predicting train delays based on real-time simulation data and historical trends.

  Given the following information, predict the potential delay for train {{trainId}}:

  Current Location: {{currentLocation}}
  Route So Far: {{routeSoFar}}
  Scheduled Arrival Time: {{scheduledArrivalTime}} seconds
  Historical Data Summary: {{historicalDataSummary}}
  Real-Time Events: {{realTimeEvents}}

  Consider all factors to predict the delay, estimate the new arrival time, identify bottleneck sections, and provide a confidence level.
  Make sure to use the proper units when providing your output.

  Output your repsonse as a JSON object:
  {
    "predictedDelaySeconds": "estimated delay in seconds",
    "estimatedArrivalTime": "estimated arrival time in seconds",
    "likelyBottleneckSections": "pipe (|) separated list of bottleneck sections (u->v)",
    "confidenceLevel": "confidence level (high, medium, low)"
  }`,
});

const predictiveDelayFlow = ai.defineFlow(
  {
    name: 'predictiveDelayFlow',
    inputSchema: PredictiveDelayInputSchema,
    outputSchema: PredictiveDelayOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
