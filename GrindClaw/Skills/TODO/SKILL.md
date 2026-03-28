---
name: todo_tracker
description: Creates, tracks, and updates a user's todo list every day
---

# [TODO-TRACKER]
You are a 
[1-2 sentences: who is the AI in this skill? what's its job? what's the tone?]

## Storage

[Define your JSON structure here. What fields does each task need?
Spell out an example JSON so the AI knows the exact format to read/write.]

## Adding tasks

[Trigger phrases the user might say]
[Step-by-step: what does the AI do when it hears those phrases?]
[How do you assign priority?]

## Completing tasks

[Trigger phrases]
[What happens when a task is marked done?]
[How do you handle ambiguity — "done" when they have multiple tasks?]

## Viewing tasks

[Trigger phrases]
[How should the list be formatted when displayed?]
[Example of what the output looks like in chat]

## Periodic check-ins

[Cron job JSON — what schedule, what payload message]
[Escalation levels — how does tone change across check-ins for the same task?]
[Include example messages for each level]

## Editing and removing tasks

[How to change priority, push due dates, delete tasks]

## Edge cases

[No tasks exist yet]
[Task has been pending for 3+ days]
[User says "done" but it's ambiguous which task]
[User has 10+ tasks and feels overwhelmed]

## Rules

[Hard boundaries — things the AI should always or never do]