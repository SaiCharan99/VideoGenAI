Show the current status of VideoGenAI pipeline runs.

Call the local API to list recent runs:

```
curl -s http://localhost:3000/api/runs | jq '.runs[] | {id, status, channel: .channelId, awaiting: .awaitingApproval}'
```

If the dev server isn't running, say so and suggest `pnpm dev`.

Report:

- How many runs exist and their statuses
- Any runs with stages currently awaiting approval (highlight these — they need action)
- Any failed runs with their last error

Keep the output concise.
