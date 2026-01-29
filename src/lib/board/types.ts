import type {
	AggregatedSession,
	AggregatedFeature,
	AggregatedHandoff,
	AggregatedCommit,
	AggregatedFeatureError,
	AggregatedMemory,
	AggregatedQualityReflection
} from '$lib/server/db/types';

export type TimelineEvent =
	| { type: 'feature'; timestamp: number; data: AggregatedFeature }
	| { type: 'handoff'; timestamp: number; data: AggregatedHandoff }
	| { type: 'commit'; timestamp: number; data: AggregatedCommit }
	| { type: 'error'; timestamp: number; data: AggregatedFeatureError }
	| { type: 'memory'; timestamp: number; data: AggregatedMemory }
	| { type: 'quality'; timestamp: number; data: AggregatedQualityReflection };

export interface TimelineData {
	sessions: AggregatedSession[];
	eventsBySession: Record<string, TimelineEvent[]>;
	activeSession: AggregatedSession | null;
	timeRange: { start: number; end: number };
}
