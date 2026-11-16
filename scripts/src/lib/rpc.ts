/** Minimal JSON-RPC calls the scripts need before and after a local deployment. */

export const LOCAL_CHAIN_ID = 31_337;

export async function rpcCall(
  url: string,
  method: string,
  params: unknown[] = [],
): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`${method}: RPC HTTP ${String(response.status)}`);
  const body = (await response.json()) as { result?: unknown; error?: { message?: string } };
  if (body.error) throw new Error(`${method}: ${body.error.message ?? 'RPC hatası'}`);
  if (body.result === undefined) throw new Error(`${method}: RPC yanıtında sonuç yok`);
  return body.result;
}

/** The chain id the endpoint reports (`eth_chainId`), the only one a broadcast can reach. */
export async function rpcChainId(url: string): Promise<number> {
  const value = await rpcCall(url, 'eth_chainId');
  if (typeof value !== 'string' || !/^0x[0-9a-f]+$/iu.test(value)) {
    throw new Error('eth_chainId: beklenmeyen yanıt');
  }
  return Number.parseInt(value, 16);
}

/** Whether a contract is deployed at `address`. */
export async function rpcHasCode(url: string, address: string): Promise<boolean> {
  const code = await rpcCall(url, 'eth_getCode', [address, 'latest']);
  return typeof code === 'string' && code !== '0x';
}
