# Follow-ups from a chat dump

Paste a week of client chats, get who is waiting on you, what you promised, and a draft reply for each.

## The prompt

Paste this into Claude Code.

```
I want to know who is waiting on me.

Ask me one thing first: paste in the last few days of my client chats (copy from Messenger, WhatsApp, Viber, or email, one conversation after another, names included), or point you to a text file that has them.

Once you have the chats, go through every conversation and write a file called "followups-[today's date].md" with:
1. Every person who asked me something I have not answered yet, with the question in one line and how many days it has been waiting.
2. Every promise I made in those chats (a price, a file, a call, a date) that I have not delivered yet, one line each.
3. For each item in 1 and 2, a short draft reply in my tone, ready to paste back into the chat. Use the words I actually use in the chats, not a formal template.
4. At the top, the three replies to send first, and why those three.

Do not invent anything I did not say in the chats. If you are not sure whether something was answered, put it in a "not sure" list at the bottom instead of guessing.

When it is done, print the top three in the chat and tell me the file path.

To check it worked: open one of the chats it flagged and confirm the question really is still unanswered. If it flagged something you already replied to, tell Claude which one, so it learns what "answered" looks like in your chats.
```

## How to check it worked

open one of the chats it flagged and confirm the question really is still unanswered. If it flagged something you already replied to, tell Claude which one, so it learns what "answered" looks like in your chats.
