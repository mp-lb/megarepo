import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createMdKitHttpHandlers } from "./http";
import type { MdKitTransportStore } from "./store";

export type RegisterMdKitFastifyOptions = {
  prefix?: string;
  store: MdKitTransportStore;
};

const send = async (
  reply: FastifyReply,
  response: Promise<{ body: unknown; status: number }>,
) => {
  const { body, status } = await response;
  return reply.status(status).send(body);
};

const toRequest = (request: FastifyRequest) => ({
  body: request.body,
  params: request.params as Record<string, unknown>,
  query: request.query as Record<string, unknown>,
});

export const registerMdKitFastify = async (
  app: FastifyInstance,
  { prefix = "", store }: RegisterMdKitFastifyOptions,
) => {
  const handlers = createMdKitHttpHandlers(store);

  app.get(`${prefix}/documents`, (request, reply) =>
    send(reply, handlers.readDocument(toRequest(request))),
  );

  app.put(`${prefix}/documents`, (request, reply) =>
    send(reply, handlers.writeDocument(toRequest(request))),
  );

  app.post(`${prefix}/documents/resync`, (request, reply) =>
    send(reply, handlers.resyncDocument(toRequest(request))),
  );

  app.get(`${prefix}/versions`, (request, reply) =>
    send(reply, handlers.listDocumentVersions(toRequest(request))),
  );

  app.get(`${prefix}/versions/:versionId`, (request, reply) =>
    send(reply, handlers.readDocumentVersion(toRequest(request))),
  );

  app.post(`${prefix}/versions/:versionId/restore`, (request, reply) =>
    send(reply, handlers.restoreDocumentVersion(toRequest(request))),
  );
};
