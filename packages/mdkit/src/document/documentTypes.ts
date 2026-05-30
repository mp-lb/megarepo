import type { HocuspocusProvider } from "@hocuspocus/provider";
import type * as Y from "yjs";

export type MdKitDocumentVersionToken = string | number | null;

export type MdKitDocumentSnapshot = {
  content: string;
  version: MdKitDocumentVersionToken;
  updatedAt?: string | null;
};

export type MdKitDocumentWriteInput = {
  documentId: string;
  content: string;
  baseVersion: MdKitDocumentVersionToken;
  force?: boolean;
};

export type MdKitDocumentWriteResult =
  | {
      version: MdKitDocumentVersionToken;
      updatedAt?: string | null;
    }
  | {
      conflict: true;
      version?: MdKitDocumentVersionToken;
      updatedAt?: string | null;
    };

export type MdKitDocumentVersionSummary = {
  id: string;
  label?: string;
  createdAt: string;
  authorLabel?: string | null;
  updatedAt?: string | null;
  version?: MdKitDocumentVersionToken;
};

export type MdKitDocumentVersionDetail = MdKitDocumentVersionSummary & {
  content: string;
};

export interface MdKitDocumentAdapter {
  readDocument(documentId: string): Promise<MdKitDocumentSnapshot>;
  writeDocument(
    input: MdKitDocumentWriteInput,
  ): Promise<MdKitDocumentWriteResult>;
  resyncDocument?(documentId: string): Promise<MdKitDocumentSnapshot>;
  listDocumentVersions?(
    documentId: string,
  ): Promise<MdKitDocumentVersionSummary[]>;
  readDocumentVersion?(input: {
    documentId: string;
    versionId: string;
  }): Promise<MdKitDocumentVersionDetail | null>;
}

export type MdKitCollaborationStatus =
  | "connecting"
  | "connected"
  | "disconnected";

export type MdKitCollaborationParticipant = {
  id: string;
  name: string;
  color?: string;
  imageUrl?: string;
};

export type MdKitCollaborationPresence = MdKitCollaborationParticipant & {
  clientId: number;
  isLocal: boolean;
};

export type MdKitCollaborationSession = {
  collaborator: MdKitCollaborationParticipant;
  document: Y.Doc;
  isCollaborating: boolean;
  otherParticipants: MdKitCollaborationPresence[];
  participants: MdKitCollaborationPresence[];
  provider: HocuspocusProvider | null;
  roomName: string;
  status: MdKitCollaborationStatus;
};
