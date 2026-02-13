# backend/app/services/pipeline.py
# Full analysis pipeline orchestrator
# Ties together ZIP extraction, parsing, extraction, aggregation, evaluation
# Manages state transitions, emits SSE progress events, tracks metrics
# Related: all other services, convex_client.py
