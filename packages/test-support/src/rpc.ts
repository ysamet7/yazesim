/** A stand-in JSON-RPC endpoint for startup-guard tests (golden rule 5). */
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface FakeRpc {
  readonly url: string;
  close(): Promise<void>;
}

/**
 * Answers every JSON-RPC request with `chainId`, as `eth_chainId` would.
 * Defaults to Avalanche mainnet (43114), the chain the apps must refuse.
 */
export async function fakeChainRpc(chainId = 43_114): Promise<FakeRpc> {
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk: Buffer) => (body += chunk.toString()));
    req.on('end', () => {
      const { id } = JSON.parse(body) as { id: number };
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ jsonrpc: '2.0', id, result: `0x${chainId.toString(16)}` }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${String(port)}`,
    close: () =>
      new Promise<void>((resolve) =>
        server.close(() => {
          resolve();
        }),
      ),
  };
}
