# SOP from a voice ramble

Paste a messy explanation of how you do a task, get a numbered SOP a new hire can follow without asking you.

## The prompt

Paste this into Claude Code.

```
I want to turn the way I do one task into a written SOP my staff can follow.

Ask me one thing first: explain the task to me the way you would explain it out loud to a new hire, in one messy paragraph or a voice memo transcript, with every "and then" and "oh wait, before that" left in. Do not clean it up, I will do that.

Once I paste it, write a file called "sop-[short task name].md" with:
1. A one-line purpose: what this task is for and when it is done.
2. What you need before starting (accounts, files, tools, which passwords to ask for, never the passwords themselves).
3. The steps, numbered, one action per step, in the order they actually happen, not the order I said them in.
4. The places I said "usually" or "depends": turn each into an if-this-then-that line so the new hire does not have to ask.
5. A "done when" line: how the person knows the task is finished and who to tell.

Keep every step short enough to read while doing it. If I skipped something obvious (like logging in), add it and mark it with (added), so I can check it.

When it is done, print the numbered steps in the chat and tell me the file path.

To check it worked: hand the SOP to someone who has never done the task and watch them do it. Every place they stop to ask you a question is a step Claude should rewrite, tell it which one.
```

## How to check it worked

hand the SOP to someone who has never done the task and watch them do it. Every place they stop to ask you a question is a step Claude should rewrite, tell it which one.
