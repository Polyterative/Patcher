import {
  Pipe,
  PipeTransform
} from '@angular/core';


export type TimestampInput = string | Date | number | null | undefined;

const naiveIsoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

export function normalizeSupabaseUtcTimestamp(value: string): string;
export function normalizeSupabaseUtcTimestamp(value: Date): Date;
export function normalizeSupabaseUtcTimestamp(value: number): number;
export function normalizeSupabaseUtcTimestamp(value: null): null;
export function normalizeSupabaseUtcTimestamp(value: undefined): undefined;
export function normalizeSupabaseUtcTimestamp(value: TimestampInput): TimestampInput;
export function normalizeSupabaseUtcTimestamp(value: TimestampInput): TimestampInput {
  if (typeof value !== 'string') {
    return value;
  }
  
  return naiveIsoTimestampPattern.test(value) ? `${ value }Z` : value;
}

@Pipe({
  name: 'supabaseUtcTimestamp',
  standalone: true
})
export class SupabaseUtcTimestampPipe implements PipeTransform {
  transform(value: TimestampInput): TimestampInput {
    return normalizeSupabaseUtcTimestamp(value);
  }
}
