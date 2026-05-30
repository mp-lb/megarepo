export class MdCompileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MdCompileError";
  }
}
