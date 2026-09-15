# Morning brief from inbox and calendar

Reads today's calendar export or a pasted inbox dump and writes a 10-line brief with the three things to do first.

## The prompt

Paste this into Claude Code.

```
I want a morning brief.

Ask me one thing first: do I want to paste in today's calendar (copy it from Google Calendar or your phone) and a rough dump of what is in my email inbox right now, or do I have a calendar export file (.ics or .csv) to point you to.

Once I give you that, read it and write a file called "brief-[today's date].md" with exactly this shape:
1. A one-line summary of how full today is (light, normal, packed).
2. The three things to do first, in order, and why those three over everything else.
3. Every meeting today with the time and who it is with.
4. Anything in the inbox dump that looks urgent or time-sensitive, each in one line.
5. One thing I could cancel or move if today gets tight.

Keep the whole file to about 10 lines of actual content, no filler.

When it is done, print the brief in the chat as well as saving the file, and tell me the file path.

To check it worked: read the brief back and see if the three things to do first actually match what matters most to you today. If they do not, tell Claude what it got wrong so it can fix the rule for next time.
```

## How to check it worked

Read the brief back and see if the three things to do first actually match what matters most to you today. If they do not, tell Claude what it got wrong so it can fix the rule for next time.
