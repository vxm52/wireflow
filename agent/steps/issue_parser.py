"""Issue parser stub."""
from agent.context import RunContext


def run(ctx: RunContext) -> None:
    ctx.issue.task_type = "bug_fix"
