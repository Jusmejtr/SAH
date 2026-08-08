export class CancelledError extends Error {
  constructor() {
    super("Cancelled.");
    this.name = "CancelledError";
  }
}

export const throwIfCancelled = (job) => {
  if (job?.cancelled) throw new CancelledError();
};
