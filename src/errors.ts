export class ID3Error extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message);
    this.name = 'ID3Error';
    this.cause = options?.cause;
    Object.setPrototypeOf(this, ID3Error.prototype);
  }
}
