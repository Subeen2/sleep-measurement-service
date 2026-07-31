import { AlcoholType, OverallCondition, PhysicalCondition } from './sleepTypes';

export const OVERALL_CONDITION_OPTIONS: { value: OverallCondition; label: string }[] = [
  { value: 'tired', label: '피곤함' },
  { value: 'better_than_usual', label: '평소보다 개운함' },
  { value: 'refreshed', label: '개운함' },
];

export const OVERALL_CONDITION_LABEL: Record<OverallCondition, string> = {
  tired: '피곤함',
  better_than_usual: '평소보다 개운함',
  refreshed: '개운함',
};

export const PHYSICAL_CONDITION_OPTIONS: { value: PhysicalCondition; label: string }[] = [
  { value: 'headache', label: '머리아픔' },
  { value: 'groggy', label: '멍함' },
  { value: 'none', label: '안아픔' },
];

export const PHYSICAL_CONDITION_LABEL: Record<PhysicalCondition, string> = {
  headache: '머리아픔',
  groggy: '멍함',
  none: '안아픔',
};

export const ALCOHOL_OPTIONS: { value: AlcoholType; label: string }[] = [
  { value: 'beer', label: '맥주' },
  { value: 'wine', label: '와인' },
  { value: 'soju', label: '소주' },
  { value: 'spirits', label: '양주' },
  { value: 'other', label: '기타' },
];

export const ALCOHOL_LABEL: Record<AlcoholType, string> = {
  beer: '맥주',
  wine: '와인',
  soju: '소주',
  spirits: '양주',
  other: '기타',
};
