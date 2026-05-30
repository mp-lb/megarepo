import type {
  MdKitDocumentSnapshot,
  MdKitDocumentVersionDetail,
  MdKitDocumentVersionSummary,
  MdKitDocumentWriteInput,
  MdKitDocumentWriteResult,
} from "../document/documentTypes";

export type MdKitTransportStore = {
  readDocument(
    documentId: string,
  ): Promise<MdKitDocumentSnapshot> | MdKitDocumentSnapshot;
  writeDocument(
    input: MdKitDocumentWriteInput,
  ): Promise<MdKitDocumentWriteResult> | MdKitDocumentWriteResult;
  resyncDocument?(
    documentId: string,
  ): Promise<MdKitDocumentSnapshot> | MdKitDocumentSnapshot;
  listDocumentVersions?(
    documentId: string,
  ): Promise<MdKitDocumentVersionSummary[]> | MdKitDocumentVersionSummary[];
  readDocumentVersion?(input: {
    documentId: string;
    versionId: string;
  }):
    | Promise<MdKitDocumentVersionDetail | null>
    | MdKitDocumentVersionDetail
    | null;
  restoreDocumentVersion?(input: {
    documentId: string;
    versionId: string;
  }): Promise<MdKitDocumentWriteResult> | MdKitDocumentWriteResult;
  readCollaborationState?(
    documentName: string,
  ): Promise<Uint8Array | null> | Uint8Array | null;
  writeCollaborationState?(
    documentName: string,
    state: Uint8Array,
  ): Promise<void> | void;
};

export type MdKitRestoreDocumentVersionInput = {
  documentId: string;
  versionId: string;
};
