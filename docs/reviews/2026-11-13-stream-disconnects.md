# Cancelled download logging

Reproduced the reported Node ERR_STREAM_PREMATURE_CLOSE stack by deliberately cancelling a large HTTP static download. The same server continued serving requests. This demonstrates a harmless cause of this stack, not a diagnosis of the exact request on the user's Windows computer.

The response streaming helper now recognizes downstream close before pipeline cleanup destroys the source. Only confirmed downstream ERR_STREAM_PREMATURE_CLOSE/ECONNRESET cancellations are quieted. Source disk errors and source premature closes still propagate to the server error log. Failed responses no longer append JSON to partial media or write to destroyed sockets. API response streams and static files use the same helper; uploaded data processing is unchanged.

Validation: failing integration regression observed before fix; 120 tests pass after fix, including real local HTTP cancellation, recovery GET, Web-stream cancellation/resource cleanup, source EIO, and source premature-close cases. Typecheck, lint, local production build pass. Existing frontend assets retained, server bundle rebuilt and package hash updated. No save format, data directory, host security, deployment or merge changes. Windows/TV testing not performed here.

If the aquarium still loads and fish swim, these old messages alone do not require resetting or deleting saved data. If the page fails or video stalls without navigation, report that symptom rather than assuming cancellation explains everything.
