export type OverallCondition = 'tired' | 'better_than_usual' | 'refreshed';
export type PhysicalCondition = 'headache' | 'groggy' | 'none';
export type AlcoholType = 'beer' | 'wine' | 'soju' | 'spirits' | 'other';

export interface SleepEntry {
  date: string; // YYYY-MM-DD, the day this entry represents (the wake-up day)
  bedTime: string; // "HH:mm"
  lastScreenTime: string; // "HH:mm"
  wakeTime: string; // "HH:mm"
  overallCondition: OverallCondition;
  physicalCondition: PhysicalCondition;
  caffeineShots: number; // 0 if none
  caffeineTime?: string; // "HH:mm"
  hadAlcohol: boolean;
  alcoholType?: AlcoholType;
  lastMealTime?: string; // "HH:mm"
}
