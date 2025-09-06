// disruption-impact-tool.ts
'use server';

/**
 * @fileOverview Simulates the impact of a disruption on train schedules and suggests adjustments.
 *
 * - simulateDisruptionImpact - Simulates the impact of a disruption on train schedules.
 * - DisruptionImpactInput - The input type for the simulateDisruptionImpact function.
 * - DisruptionImpactOutput - The return type for the simulateDisruptionImpact function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DisruptionImpactInputSchema = z.object({
  sectionU: z.string().describe('The starting station code of the disrupted section.'),
  sectionV: z.string().describe('The ending station code of the disrupted section.'),
  startTimeS: z.number().int().describe('The start time of the disruption in seconds since the simulation began.'),
  endTimeS: z.number().int().describe('The end time of the disruption in seconds since the simulation began.'),
  speedFactor: z.number().describe('The speed factor to apply to the disrupted section (e.g., 0.5 for 50% speed).'),
  affectedTrainIds: z.array(z.string()).optional().describe('List of train IDs potentially affected by the disruption. If empty, the tool will attempt to determine.'),
});
export type DisruptionImpactInput = z.infer<typeof DisruptionImpactInputSchema>;

const DisruptionImpactOutputSchema = z.object({
  estimatedDelays: z.record(z.string(), z.number()).describe('Estimated delay in seconds for each affected train.'),
  affectedTrains: z.array(z.string()).describe('List of train IDs affected by the disruption.'),
  suggestedAdjustments: z.string().describe('Suggestions for alternative routes or schedule adjustments.'),
});
export type DisruptionImpactOutput = z.infer<typeof DisruptionImpactOutputSchema>;

export async function simulateDisruptionImpact(input: DisruptionImpactInput): Promise<DisruptionImpactOutput> {
  return disruptionImpactFlow(input);
}

const disruptionImpactPrompt = ai.definePrompt({
  name: 'disruptionImpactPrompt',
  input: {
    schema: DisruptionImpactInputSchema,
  },
  output: {
    schema: DisruptionImpactOutputSchema,
  },
  prompt: `You are a railway operations expert. Analyze the impact of a disruption on train schedules and provide suggestions.

A disruption has occurred on the section between stations {{sectionU}} and {{sectionV}} from time {{startTimeS}} to {{endTimeS}}. The speed factor on this section is reduced to {{speedFactor}}.

{% if affectedTrainIds.length > 0 %}
The following trains are potentially affected: {{affectedTrainIds}}.
{% else %}
Please identify the trains that are likely to be affected by this disruption.
{% endif %}

Estimate the delays for each affected train and provide suggestions for alternative routes or schedule adjustments. The delay estimations should factor in the reduced speed on the affected section.

Output a JSON object with 'estimatedDelays', 'affectedTrains', and 'suggestedAdjustments' fields.
`, // Modified prompt to utilize Handlebars templating and conditional logic.
});

const disruptionImpactFlow = ai.defineFlow(
  {
    name: 'disruptionImpactFlow',
    inputSchema: DisruptionImpactInputSchema,
    outputSchema: DisruptionImpactOutputSchema,
  },
  async input => {
    const {output} = await disruptionImpactPrompt(input);
    return output!;
  }
);
