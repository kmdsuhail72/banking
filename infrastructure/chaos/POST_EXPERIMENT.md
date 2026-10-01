# Post-experiment record

Copy this template into your non-production incident record. Attach the immutable JSON run report and appropriate lab logs/screenshots; do not attach credentials or customer data.

- Experiment name / run ID / UTC start and finish:
- Operator / reviewer / linked change or incident:
- Hypothesis and expected result:
- Cluster UID / namespace UID / API server / approved application digest:
- Selected source Pod name and UID / container / dependency Pod names:
- Actual blast radius, including any unexpected restart or node effect:
- Baseline traffic, technical error ratio, p50/p95/p99, CPU/memory and ready replicas:
- Injection proof (Pod UID loss, restart delta, AllInjected event, measured stress increase or load Job completion):
- Worst observed error ratio, p95/p99, available replicas, node/container pressure and achieved load:
- Integrity evidence: expected seed counts/balance, read-only DB role, before/after digest, maximum violation count, witness freshness and unchanged database UID:
- Stop reason: normal expiry / safety abort / manual stop / unknown telemetry:
- Rollback actions, deletion/finalizer evidence and cleanup confirmation:
- Time to stable recovery and remaining SLO/error-budget considerations (lab only):
- Result: PASS / FAILED / ABORTED / INCONCLUSIVE / CLEANUP_REQUIRED:
- Root cause of unexpected behavior; separate injected cause from resilience defect:
- What went well / what failed / detection gaps:
- Remediation tasks with owner, due date, verification and follow-up experiment:
- Reviewer decision: allow next bounded experiment / hold campaign:

A lack of errors is not enough: show that the intended fault and meaningful traffic were observed. Do not mark an integrity-unknown or failed-cleanup run successful. Preserve failed evidence before resetting the disposable fixture. Escalate any real-data or unexpected external connection discovery as a boundary breach and stop the entire campaign.
