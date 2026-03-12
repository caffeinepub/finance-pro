// Stub backend - this app uses localStorage for all data storage
export interface backendInterface {
  _initializeAccessControlWithSecret: (token: string) => Promise<void>;
}

export interface CreateActorOptions {
  agentOptions?: Record<string, unknown>;
}

export class ExternalBlob {
  static fromURL(_url: string): ExternalBlob { return new ExternalBlob(); }
  async getBytes(): Promise<Uint8Array> { return new Uint8Array(); }
  onProgress?: (progress: number) => void;
}

export function createActor(
  _canisterId: string,
  _uploadFile: (file: ExternalBlob) => Promise<Uint8Array>,
  _downloadFile: (bytes: Uint8Array) => Promise<ExternalBlob>,
  _options?: CreateActorOptions,
): backendInterface {
  return {
    _initializeAccessControlWithSecret: async () => {},
  };
}
