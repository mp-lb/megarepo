import type {
  MdKitDocumentAdapter,
  MdKitDocumentVersionSummary,
} from "../document/documentTypes";

export type CreateMdKitRestAdapterOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const documentQuery = (documentId: string) =>
  `documentId=${encodeURIComponent(documentId)}`;

const readJson = async <T>(response: Response): Promise<T> => {
  const body = (await response.json()) as T;

  if (!response.ok && response.status !== 409) {
    throw new Error(`MdKit REST request failed: ${response.status}`);
  }

  return body;
};

export const createMdKitRestAdapter = ({
  baseUrl,
  fetch: fetchImpl = fetch,
}: CreateMdKitRestAdapterOptions): MdKitDocumentAdapter => {
  const url = trimTrailingSlash(baseUrl);

  return {
    readDocument: async (documentId) =>
      readJson(
        await fetchImpl(`${url}/documents?${documentQuery(documentId)}`),
      ),
    writeDocument: async (input) =>
      readJson(
        await fetchImpl(`${url}/documents?${documentQuery(input.documentId)}`, {
          body: JSON.stringify(input),
          headers: { "Content-Type": "application/json" },
          method: "PUT",
        }),
      ),
    resyncDocument: async (documentId) =>
      readJson(
        await fetchImpl(
          `${url}/documents/resync?${documentQuery(documentId)}`,
          {
            method: "POST",
          },
        ),
      ),
    listDocumentVersions: async (documentId) => {
      const body = await readJson<{ versions: MdKitDocumentVersionSummary[] }>(
        await fetchImpl(`${url}/versions?${documentQuery(documentId)}`),
      );

      return body.versions;
    },
    readDocumentVersion: async ({ documentId, versionId }) => {
      const response = await fetchImpl(
        `${url}/versions/${encodeURIComponent(versionId)}?${documentQuery(
          documentId,
        )}`,
      );

      if (response.status === 404) {
        return null;
      }

      return readJson(response);
    },
  };
};
