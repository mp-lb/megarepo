import type {
  MdKitDocumentVersionDetail,
  MdKitDocumentWriteInput,
  MdKitDocumentWriteResult,
} from "../document/documentTypes";

export type MdKitCheckpointPolicyInput = {
  currentContent: string;
  documentId: string;
  editDistance: number;
  previousCheckpoint: MdKitDocumentVersionDetail | null;
  previousCheckpointContent: string | null;
  timeSinceLastCheckpointMs: number | null;
  writeInput: MdKitDocumentWriteInput;
  writeResult: MdKitDocumentWriteResult;
};

export type MdKitCheckpointPolicy = {
  shouldCheckpoint(
    input: MdKitCheckpointPolicyInput,
  ): boolean | Promise<boolean>;
};

export type MdKitSmartCheckpointPolicyOptions = {
  minEditDistance?: number;
  minIntervalMs?: number;
};

const defaultMinEditDistance = 250;
const defaultMinIntervalMs = 5 * 60_000;

export const measureMdKitEditDistance = (left: string, right: string) => {
  if (left === right) {
    return 0;
  }

  if (left.length === 0) {
    return right.length;
  }

  if (right.length === 0) {
    return left.length;
  }

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  let current = new Array<number>(right.length + 1);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + cost,
      );
    }

    [previous, current] = [current, previous];
  }

  return previous[right.length] ?? 0;
};

export const CheckpointPolicy = {
  always: (): MdKitCheckpointPolicy => ({
    shouldCheckpoint: () => true,
  }),
  function: (
    shouldCheckpoint: MdKitCheckpointPolicy["shouldCheckpoint"],
  ): MdKitCheckpointPolicy => ({
    shouldCheckpoint,
  }),
  never: (): MdKitCheckpointPolicy => ({
    shouldCheckpoint: () => false,
  }),
  smart: (
    options: MdKitSmartCheckpointPolicyOptions = {},
  ): MdKitCheckpointPolicy => {
    const minEditDistance =
      options.minEditDistance ?? defaultMinEditDistance;
    const minIntervalMs = options.minIntervalMs ?? defaultMinIntervalMs;

    return {
      shouldCheckpoint: ({
        editDistance,
        previousCheckpoint,
        timeSinceLastCheckpointMs,
      }) =>
        !previousCheckpoint ||
        editDistance >= minEditDistance ||
        (timeSinceLastCheckpointMs !== null &&
          timeSinceLastCheckpointMs >= minIntervalMs),
    };
  },
} as const;
