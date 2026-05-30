import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  MdKitDocumentAdapter,
  MdKitDocumentVersionToken,
} from "./documentTypes";

export type UseMdKitDocumentOptions = {
  adapter: Pick<
    MdKitDocumentAdapter,
    "readDocument" | "writeDocument" | "resyncDocument"
  >;
  debounceMs?: number;
  documentId: string | null;
  pollMs?: number;
};

export type MdKitDocumentConflictDetails = {
  baseContent: string;
  localContent: string;
  remoteContent: string | null;
  remoteUpdatedAt: string | null;
  remoteVersion: MdKitDocumentVersionToken;
};

export type MdKitDocumentController = {
  conflict: boolean;
  conflictDetails: MdKitDocumentConflictDetails | null;
  error: string | null;
  isDirty: boolean;
  isFocused: boolean;
  isLoading: boolean;
  revision: number;
  saveNow: () => Promise<boolean>;
  saveStatus: "idle" | "pending" | "saving" | "saved";
  forceSave: () => Promise<boolean>;
  resync: () => Promise<void>;
  setContent: (next: string) => void;
  setFocused: (focused: boolean) => void;
  updatedAt: string | null;
  value: string;
  version: MdKitDocumentVersionToken;
};

const emptyDocumentState = {
  content: "",
  updatedAt: null,
  version: null,
} as const;

export const useMdKitDocument = (
  options: UseMdKitDocumentOptions,
): MdKitDocumentController => {
  const { adapter, debounceMs = 1000, documentId, pollMs = 2000 } = options;

  const [local, setLocal] = useState("");
  const [base, setBase] = useState("");
  const [version, setVersion] = useState<MdKitDocumentVersionToken>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const [isLoading, setIsLoading] = useState(!!documentId);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const [conflictDetails, setConflictDetails] =
    useState<MdKitDocumentConflictDetails | null>(null);

  const [isFocused, setIsFocused] = useState(false);

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "pending" | "saving" | "saved"
  >("idle");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const queuedSaveRef = useRef(false);
  const localRef = useRef(local);
  const baseRef = useRef(base);
  const versionRef = useRef(version);
  const updatedAtRef = useRef(updatedAt);
  const conflictRef = useRef(conflict);
  const focusedRef = useRef(isFocused);

  useEffect(() => {
    localRef.current = local;
  }, [local]);

  useEffect(() => {
    baseRef.current = base;
  }, [base]);

  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  useEffect(() => {
    updatedAtRef.current = updatedAt;
  }, [updatedAt]);

  useEffect(() => {
    conflictRef.current = conflict;
  }, [conflict]);

  useEffect(() => {
    focusedRef.current = isFocused;
  }, [isFocused]);

  const isDirty = local !== base;

  const setFocused = useCallback((focused: boolean) => {
    focusedRef.current = focused;
    setIsFocused(focused);
  }, []);

  const applyRemoteSnapshot = useCallback(
    (
      next: {
        content: string;
        updatedAt?: string | null;
        version: MdKitDocumentVersionToken;
      },
      bumpRevision: boolean,
    ) => {
      localRef.current = next.content;
      baseRef.current = next.content;
      versionRef.current = next.version;
      updatedAtRef.current = next.updatedAt ?? null;
      conflictRef.current = false;

      setLocal(next.content);
      setBase(next.content);
      setVersion(next.version);
      setUpdatedAt(next.updatedAt ?? null);
      setConflict(false);
      setConflictDetails(null);
      setError(null);

      if (bumpRevision) {
        setRevision((current: number) => current + 1);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    localRef.current = emptyDocumentState.content;
    baseRef.current = emptyDocumentState.content;
    versionRef.current = emptyDocumentState.version;
    updatedAtRef.current = emptyDocumentState.updatedAt;
    conflictRef.current = false;
    focusedRef.current = false;

    setLocal(emptyDocumentState.content);
    setBase(emptyDocumentState.content);
    setVersion(emptyDocumentState.version);
    setUpdatedAt(emptyDocumentState.updatedAt);
    setRevision(0);
    setIsLoading(false);
    setError(null);
    setConflict(false);
    setConflictDetails(null);
    setSaveStatus("idle");
    setFocused(false);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    isSavingRef.current = false;
    queuedSaveRef.current = false;
  }, [setFocused]);

  useEffect(() => {
    if (!documentId) {
      reset();
      return;
    }

    let cancelled = false;

    setIsLoading(true);
    setError(null);
    setConflict(false);
    setConflictDetails(null);
    setSaveStatus("idle");
    queuedSaveRef.current = false;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    adapter
      .readDocument(documentId)
      .then((result) => {
        if (cancelled) {
          return;
        }

        applyRemoteSnapshot(result, true);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        setError(String(err));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [adapter, applyRemoteSnapshot, documentId, reset]);

  useEffect(() => {
    if (!documentId || pollMs <= 0) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      if (cancelled || isSavingRef.current) {
        return;
      }

      try {
        const remote = await adapter.readDocument(documentId);

        if (cancelled) {
          return;
        }

        const remoteContent = remote.content;
        const remoteVersion = remote.version;
        const localNow = localRef.current;
        const baseNow = baseRef.current;
        const versionNow = versionRef.current;
        const dirtyNow = localNow !== baseNow;

        if (dirtyNow) {
          if (remoteContent !== baseNow || remoteVersion !== versionNow) {
            const nextConflictDetails = {
              baseContent: baseNow,
              localContent: localNow,
              remoteContent,
              remoteUpdatedAt: remote.updatedAt ?? null,
              remoteVersion,
            };

            conflictRef.current = true;
            versionRef.current = remoteVersion;
            updatedAtRef.current = remote.updatedAt ?? updatedAtRef.current;
            setConflict(true);
            setConflictDetails(nextConflictDetails);
            setError("Remote document changed while you have unsaved edits.");
            setVersion(remoteVersion);
            setUpdatedAt(remote.updatedAt ?? updatedAtRef.current);
          }

          return;
        }

        if (focusedRef.current) {
          return;
        }

        if (
          remoteContent !== baseNow ||
          remoteVersion !== versionNow ||
          conflictRef.current
        ) {
          applyRemoteSnapshot(remote, true);
        }
      } catch {
        // Explicit load/save actions surface errors for callers.
      }
    };

    const interval = setInterval(() => {
      void poll();
    }, pollMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [adapter, applyRemoteSnapshot, documentId, pollMs]);

  const commitSave = useCallback(
    async (input: {
      baseVersion: MdKitDocumentVersionToken;
      force?: boolean;
    }) => {
      if (!documentId) {
        return false;
      }

      const contentToSave = localRef.current;
      const currentBase = baseRef.current;

      if (contentToSave === currentBase) {
        setSaveStatus("saved");
        return true;
      }

      const result = await adapter.writeDocument({
        baseVersion: input.baseVersion,
        content: contentToSave,
        documentId,
        ...(input.force ? { force: true } : {}),
      });

      if ("conflict" in result) {
        let remoteContent: string | null = null;
        let remoteVersion = result.version ?? versionRef.current;
        let remoteUpdatedAt = result.updatedAt ?? updatedAtRef.current;

        try {
          const remote = await adapter.readDocument(documentId);
          remoteContent = remote.content;
          remoteVersion = remote.version;
          remoteUpdatedAt = remote.updatedAt ?? null;
        } catch {
          // Conflict resolution can still proceed by keeping remote via resync
          // or overwriting remote even if the preview fetch fails.
        }

        const nextConflictDetails = {
          baseContent: currentBase,
          localContent: contentToSave,
          remoteContent,
          remoteUpdatedAt,
          remoteVersion,
        };

        conflictRef.current = true;
        setConflict(true);
        setConflictDetails(nextConflictDetails);
        setSaveStatus("idle");
        setError("Remote document changed while you have unsaved edits.");

        if (remoteVersion !== undefined) {
          versionRef.current = remoteVersion;
          setVersion(remoteVersion);
        }

        if (remoteUpdatedAt !== undefined) {
          updatedAtRef.current = remoteUpdatedAt ?? null;
          setUpdatedAt(remoteUpdatedAt ?? null);
        }

        return false;
      }

      baseRef.current = contentToSave;
      versionRef.current = result.version;
      updatedAtRef.current = result.updatedAt ?? updatedAtRef.current;
      conflictRef.current = false;

      setBase(contentToSave);
      setVersion(result.version);
      setUpdatedAt(result.updatedAt ?? updatedAtRef.current);
      setConflict(false);
      setConflictDetails(null);
      setSaveStatus("saved");
      setError(null);
      return true;
    },
    [adapter, documentId],
  );

  const scheduleSave = useCallback(() => {
    if (!documentId || conflictRef.current) {
      return;
    }

    if (localRef.current === baseRef.current) {
      setSaveStatus("saved");
      return;
    }

    setSaveStatus("pending");

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (isSavingRef.current || conflictRef.current) {
        queuedSaveRef.current = true;
        debounceRef.current = null;
        return;
      }

      isSavingRef.current = true;
      queuedSaveRef.current = false;
      setSaveStatus("saving");

      commitSave({ baseVersion: versionRef.current })
        .catch((err: unknown) => {
          setError(`Save failed: ${String(err)}`);
          setSaveStatus("idle");
          return false;
        })
        .finally(() => {
          isSavingRef.current = false;
          debounceRef.current = null;
        });
    }, debounceMs);
  }, [commitSave, debounceMs, documentId]);

  const setContent = useCallback(
    (next: string) => {
      setLocal(next);
      localRef.current = next;
      scheduleSave();
    },
    [scheduleSave],
  );

  useEffect(() => {
    if (
      saveStatus !== "saved" ||
      !queuedSaveRef.current ||
      isSavingRef.current ||
      conflictRef.current ||
      localRef.current === baseRef.current
    ) {
      return;
    }

    queuedSaveRef.current = false;
    scheduleSave();
  }, [saveStatus, scheduleSave]);

  const resync = useCallback(async () => {
    if (!documentId) {
      return;
    }

    try {
      const readRemote = adapter.resyncDocument ?? adapter.readDocument;
      const result = await readRemote(documentId);
      applyRemoteSnapshot(result, true);
    } catch (err) {
      setError(`Failed to resync: ${String(err)}`);
    }
  }, [adapter, applyRemoteSnapshot, documentId]);

  const forceSave = useCallback(async (): Promise<boolean> => {
    if (!documentId || isSavingRef.current) {
      return false;
    }

    isSavingRef.current = true;
    setSaveStatus("saving");

    try {
      return await commitSave({ baseVersion: null, force: true });
    } catch (err) {
      setError(`Force save failed: ${String(err)}`);
      setSaveStatus("idle");
      return false;
    } finally {
      isSavingRef.current = false;
    }
  }, [commitSave, documentId]);

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (!documentId) {
      return false;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (isSavingRef.current || conflictRef.current) {
      return false;
    }

    isSavingRef.current = true;
    setSaveStatus("saving");

    try {
      return await commitSave({ baseVersion: versionRef.current });
    } catch (err) {
      setError(`Save failed: ${String(err)}`);
      setSaveStatus("idle");
      return false;
    } finally {
      isSavingRef.current = false;
    }
  }, [commitSave, documentId]);

  return useMemo(
    () => ({
      conflict,
      conflictDetails,
      error,
      forceSave,
      isDirty,
      isFocused,
      isLoading,
      resync,
      revision,
      saveNow,
      saveStatus,
      setContent,
      setFocused,
      updatedAt,
      value: local,
      version,
    }),
    [
      conflict,
      conflictDetails,
      error,
      forceSave,
      isDirty,
      isFocused,
      isLoading,
      local,
      resync,
      revision,
      saveNow,
      saveStatus,
      setContent,
      setFocused,
      updatedAt,
      version,
    ],
  );
};
