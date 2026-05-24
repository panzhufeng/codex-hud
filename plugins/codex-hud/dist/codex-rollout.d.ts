import type { StdinData, TranscriptData } from './types.js';
interface CodexSnapshot {
    stdin: StdinData;
    transcript: TranscriptData;
}
export declare function findLatestCodexSession(): string | null;
export declare function parseCodexRollout(filePath: string): Promise<CodexSnapshot | null>;
export declare function loadLatestCodexSnapshot(): Promise<CodexSnapshot | null>;
export {};
//# sourceMappingURL=codex-rollout.d.ts.map