/** Local-terminal guidance only: never change ports or system settings automatically. */
export function listenFailureMessage(error: unknown, port: number): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (code === 'EADDRINUSE') {
    return `Port ${port} is already in use. Check whether your existing aquarium is open at http://localhost:${port}. Close that server with Ctrl+C before restarting. Do not start two aquarium servers using the same saved-data folder. If another app owns this port, see the README for choosing a different port.`;
  }
  if (code === 'EACCES' || code === 'EPERM') {
    return `The aquarium could not use port ${port}: the operating system denied access. Ask workplace IT which local-network setup is permitted. No network settings have been changed.`;
  }
  const detail = error instanceof Error ? error.message : 'Unknown server error';
  return `The aquarium could not start on port ${port}. ${detail}`;
}
