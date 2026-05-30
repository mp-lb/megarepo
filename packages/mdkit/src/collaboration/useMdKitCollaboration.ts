import { useCallback, useEffect, useMemo, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import type {
  MdKitCollaborationParticipant,
  MdKitCollaborationPresence,
  MdKitCollaborationSession,
  MdKitCollaborationStatus,
} from "../document/documentTypes";

export type UseMdKitCollaborationOptions = {
  collaborator: MdKitCollaborationParticipant;
  documentId: string | null;
  enabled?: boolean;
  endpoint: string | null;
  getToken?: () => Promise<string | null>;
  resolveRoomName?: (documentId: string) => string;
};

type MdKitCollaborationDebugGlobal = typeof globalThis & {
  __MDKIT_COLLAB_DEBUG__?: boolean;
};

const isCollaborationDebugEnabled = () => {
  if (
    (globalThis as MdKitCollaborationDebugGlobal).__MDKIT_COLLAB_DEBUG__ ===
    true
  ) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem("mdkit:collab-debug") === "true";
  } catch {
    return false;
  }
};

const stringifyDebugDetails = (details: Record<string, unknown>): string => {
  const seen = new WeakSet<object>();

  try {
    return JSON.stringify(details, (_key, value: unknown) => {
      if (typeof value === "bigint") {
        return value.toString();
      }

      if (!value || typeof value !== "object") {
        return value;
      }

      if (seen.has(value)) {
        return "[Circular]";
      }

      seen.add(value);
      return value;
    });
  } catch (error) {
    return JSON.stringify({
      serializationError:
        error instanceof Error ? error.message : "Unable to serialize details",
    });
  }
};

const debugCollaboration = (event: string, details: Record<string, unknown>) => {
  if (!isCollaborationDebugEnabled()) {
    return;
  }

  console.info(
    `MDKIT_COLLAB_DEBUG ${event} ${stringifyDebugDetails(details)}`,
  );
};

const createColorFromId = (id: string): string => {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(index);
    hash |= 0;
  }

  return `hsl(${Math.abs(hash) % 360}, 85%, 55%)`;
};

const parsePresence = (
  clientId: number,
  state: unknown,
  localClientId: number,
): MdKitCollaborationPresence | null => {
  if (!state || typeof state !== "object") {
    return null;
  }

  const user = "user" in state ? (state as { user?: unknown }).user : state;

  if (!user || typeof user !== "object") {
    return null;
  }

  const { color, id, imageUrl, name } = user as {
    color?: unknown;
    id?: unknown;
    imageUrl?: unknown;
    name?: unknown;
  };

  if (typeof name !== "string") {
    return null;
  }

  return {
    clientId,
    color:
      typeof color === "string"
        ? color
        : createColorFromId(typeof id === "string" ? id : String(clientId)),
    id: typeof id === "string" ? id : String(clientId),
    imageUrl: typeof imageUrl === "string" ? imageUrl : undefined,
    isLocal: clientId === localClientId,
    name,
  };
};

const summarizeAwarenessState = (clientId: number, state: unknown) => {
  if (!state || typeof state !== "object") {
    return {
      clientId,
      hasState: false,
    };
  }

  const user = "user" in state ? (state as { user?: unknown }).user : state;

  return {
    clientId,
    hasCursor: "cursor" in state,
    hasState: true,
    hasUser: !!user,
    user,
  };
};

const summarizeParticipants = (
  participants: MdKitCollaborationPresence[],
) =>
  participants.map((participant) => ({
    clientId: participant.clientId,
    id: participant.id,
    isLocal: participant.isLocal,
    name: participant.name,
  }));

const areParticipantsEqual = (
  left: MdKitCollaborationPresence[],
  right: MdKitCollaborationPresence[],
) =>
  left.length === right.length &&
  left.every((leftParticipant, index) => {
    const rightParticipant = right[index];

    return (
      rightParticipant &&
      leftParticipant.clientId === rightParticipant.clientId &&
      leftParticipant.color === rightParticipant.color &&
      leftParticipant.id === rightParticipant.id &&
      leftParticipant.imageUrl === rightParticipant.imageUrl &&
      leftParticipant.isLocal === rightParticipant.isLocal &&
      leftParticipant.name === rightParticipant.name
    );
  });

const setProviderUser = (
  provider: HocuspocusProvider,
  collaborator: MdKitCollaborationParticipant,
) => {
  provider.setAwarenessField("user", {
    color: collaborator.color,
    id: collaborator.id,
    imageUrl: collaborator.imageUrl || undefined,
    name: collaborator.name,
  });
};

export const useMdKitCollaboration = (
  options: UseMdKitCollaborationOptions,
): MdKitCollaborationSession | null => {
  const {
    collaborator,
    documentId,
    enabled = true,
    endpoint,
    getToken,
    resolveRoomName,
  } = options;

  const [status, setStatus] =
    useState<MdKitCollaborationStatus>("disconnected");
  const [participants, setParticipants] = useState<
    MdKitCollaborationPresence[]
  >([]);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  const normalizedCollaborator = useMemo(
    () => ({
      ...collaborator,
      color: collaborator.color || createColorFromId(collaborator.id),
    }),
    [
      collaborator.color,
      collaborator.id,
      collaborator.imageUrl,
      collaborator.name,
    ],
  );

  const roomName = useMemo(() => {
    if (!documentId) {
      return "";
    }

    return resolveRoomName ? resolveRoomName(documentId) : documentId;
  }, [documentId, resolveRoomName]);

  const ydoc = useMemo(() => {
    void roomName;
    return new Y.Doc();
  }, [roomName]);

  const setNextParticipants = useCallback(
    (nextParticipants: MdKitCollaborationPresence[], source: string) => {
      setParticipants((currentParticipants) =>
        areParticipantsEqual(currentParticipants, nextParticipants)
          ? currentParticipants
          : (() => {
              debugCollaboration("participants_update", {
                nextParticipants: summarizeParticipants(nextParticipants),
                previousParticipants:
                  summarizeParticipants(currentParticipants),
                roomName,
                source,
              });

              return nextParticipants;
            })(),
      );
    },
    [roomName],
  );

  const updateParticipantsFromProvider = useCallback(
    (nextProvider: HocuspocusProvider | null, source: string) => {
      const awareness = nextProvider?.awareness;

      if (!awareness) {
        debugCollaboration("awareness_missing", {
          roomName,
          source,
        });
        setNextParticipants([], source);
        return;
      }

      const rawStates = Array.from(awareness.getStates());
      const nextParticipants = rawStates
        .map(([clientId, state]) =>
          parsePresence(clientId, state, ydoc.clientID),
        )
        .filter((presence): presence is MdKitCollaborationPresence =>
          Boolean(presence),
        );

      debugCollaboration("awareness_map_read", {
        localClientId: ydoc.clientID,
        parsedParticipants: summarizeParticipants(nextParticipants),
        rawStates: rawStates.map(([clientId, state]) =>
          summarizeAwarenessState(clientId, state),
        ),
        roomName,
        source,
      });

      setNextParticipants(nextParticipants, source);
    },
    [roomName, setNextParticipants, ydoc.clientID],
  );

  useEffect(() => {
    if (!enabled || !documentId || !endpoint) {
      debugCollaboration("provider_skipped", {
        documentId,
        enabled,
        endpoint,
        roomName,
      });

      setProvider(null);
      setStatus("disconnected");
      setNextParticipants([], "provider_skipped");
      return;
    }

    debugCollaboration("provider_create", {
      collaborator: normalizedCollaborator,
      documentId,
      endpoint,
      localClientId: ydoc.clientID,
      roomName,
    });

    let nextProvider: HocuspocusProvider | null = null;

    nextProvider = new HocuspocusProvider({
      document: ydoc,
      name: roomName,
      onConnect: () => {
        if (nextProvider) {
          setProviderUser(nextProvider, normalizedCollaborator);
        }

        debugCollaboration("provider_connect", {
          localClientId: ydoc.clientID,
          roomName,
        });
        setStatus("connected");

        globalThis.setTimeout(() => {
          updateParticipantsFromProvider(nextProvider, "provider_connect");
        }, 0);
      },
      onDisconnect: () => {
        debugCollaboration("provider_disconnect", {
          localClientId: ydoc.clientID,
          roomName,
        });
        setStatus("disconnected");
      },
      onStatus: ({ status: nextStatus }) => {
        debugCollaboration("provider_status", {
          localClientId: ydoc.clientID,
          roomName,
          status: nextStatus,
        });

        if (nextStatus === "connecting") {
          setStatus("connecting");
        }
      },
      onAwarenessChange: ({ states }) => {
        debugCollaboration("provider_awareness_change", {
          localClientId: ydoc.clientID,
          rawStates: states,
          roomName,
        });

        updateParticipantsFromProvider(
          nextProvider,
          "provider_awareness_change",
        );
      },
      token: async () => {
        const token = getToken ? await getToken() : null;
        debugCollaboration("provider_token", {
          hasToken: !!token,
          roomName,
          source: getToken ? "custom" : "default",
        });
        return token || "notoken";
      },
      url: endpoint,
    });

    setProvider(nextProvider);
    setStatus("connecting");

    return () => {
      nextProvider?.destroy();
      nextProvider = null;
      setProvider(null);
      setStatus("disconnected");
      setNextParticipants([], "provider_destroy");
    };
  }, [
    documentId,
    enabled,
    endpoint,
    getToken,
    normalizedCollaborator,
    roomName,
    setNextParticipants,
    updateParticipantsFromProvider,
    ydoc,
  ]);

  useEffect(() => {
    debugCollaboration("session_options", {
      collaborator: normalizedCollaborator,
      documentId,
      enabled,
      endpoint,
      localClientId: ydoc.clientID,
      roomName,
    });
  }, [
    documentId,
    enabled,
    endpoint,
    normalizedCollaborator,
    roomName,
    ydoc.clientID,
  ]);

  useEffect(() => {
    debugCollaboration("session_state", {
      isCollaborating: participants.some((participant) => !participant.isLocal),
      participants: summarizeParticipants(participants),
      roomName,
      status: provider ? status : "disconnected",
    });
  }, [participants, provider, roomName, status]);

  useEffect(() => {
    if (!provider) {
      return;
    }

    debugCollaboration("awareness_set_user", {
      localClientId: ydoc.clientID,
      roomName,
      user: {
        color: normalizedCollaborator.color,
        id: normalizedCollaborator.id,
        imageUrl: normalizedCollaborator.imageUrl || undefined,
        name: normalizedCollaborator.name,
      },
    });

    setProviderUser(provider, normalizedCollaborator);
    updateParticipantsFromProvider(provider, "awareness_set_user");
  }, [
    normalizedCollaborator,
    provider,
    roomName,
    updateParticipantsFromProvider,
    ydoc.clientID,
  ]);

  useEffect(() => {
    const awareness = provider?.awareness;

    if (!awareness) {
      debugCollaboration("awareness_effect_missing", {
        roomName,
      });
      setNextParticipants([], "awareness_effect_missing");
      return;
    }

    const handleAwarenessChange = () =>
      updateParticipantsFromProvider(provider, "awareness_change_event");

    awareness.on("change", handleAwarenessChange);
    updateParticipantsFromProvider(provider, "awareness_change_subscribe");

    return () => {
      awareness.off("change", handleAwarenessChange);
    };
  }, [provider, roomName, setNextParticipants, updateParticipantsFromProvider]);

  useEffect(() => {
    if (!provider) {
      return;
    }

    const handleProviderAwareness = () =>
      updateParticipantsFromProvider(provider, "provider_awareness_event");

    provider.on("awarenessChange", handleProviderAwareness);
    provider.on("awarenessUpdate", handleProviderAwareness);
    updateParticipantsFromProvider(provider, "provider_awareness_subscribe");

    return () => {
      provider.off("awarenessChange", handleProviderAwareness);
      provider.off("awarenessUpdate", handleProviderAwareness);
    };
  }, [provider, updateParticipantsFromProvider]);

  return useMemo(() => {
    if (!enabled || !documentId || !endpoint) {
      return null;
    }

    const otherParticipants = participants.filter(
      (participant) => !participant.isLocal,
    );

    return {
      collaborator: normalizedCollaborator,
      document: ydoc,
      isCollaborating: otherParticipants.length > 0,
      otherParticipants,
      participants,
      provider,
      roomName,
      status: provider ? status : "disconnected",
    };
  }, [
    documentId,
    enabled,
    endpoint,
    normalizedCollaborator,
    participants,
    provider,
    roomName,
    status,
    ydoc,
  ]);
};
