# Operational recovery pass

The standalone launcher previously let a listen failure become an unhandled error stack. A second launch or a conflicting app can occupy the configured port, leaving a nontechnical host unsure whether saved fish are lost.

Added local-terminal recovery guidance for EADDRINUSE and permission-denied listen failures. It does not automatically retry, switch ports, kill processes, change security settings or delete data. The failed server closes its own storage and exits unsuccessfully. README guidance explains using the existing server first and preserving the data folder and recovery key.

Research: Node documents EADDRINUSE as another server occupying the local address, and EACCES as permission denied: https://nodejs.org/api/errors.html . Server errors are event-driven: https://nodejs.org/api/net.html#event-error .

102 automated tests, typecheck, lint and build pass. Tests exercise message selection and non-Error inputs. Live socket-conflict and platform-specific terminal behavior are not tested; prior browser/TV/phone gaps remain. No deployment or merge.

Next perspective: animation/art direction, or a real-device validation pass when available.
