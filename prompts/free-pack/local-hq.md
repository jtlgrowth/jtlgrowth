# Your AI office in 3D

Sets up your team's office in 3D on your own laptop: one desk per AI employee, today's board, and whatever accessories you ask for.

## The prompt

Paste this into Claude Code.

```
I want my AI team's office in 3D, running on my own laptop, built on the JTL HQ base (github.com/jtlgrowth/hq-base).

Ask me three things first, all at once, with options:
1. My company name and what we sell, in one line.
2. Who is on my team. If this folder has a roster.json from the /hire skill, read it (and docs/team/) and show me who you found. If not, ask me for up to six names and a one-line job each.
3. Which accessories to start with. Offer these and let me pick several: a coffee corner, a lounge set, plants by the desks, a bookshelf, a TV wall, a reading nook, an office cat, my logo on the wall.

Then do this yourself, do not just tell me how:
1. Get the base into a folder called "hq" here: git clone --depth 1 https://github.com/jtlgrowth/hq-base hq. Then read hq/CLAUDE.md and follow its rules. Never edit the base files.
2. Write my company into hq/company.json. Write my team into hq/team.json, one desk each, or leave it as [] if you are reading roster.json.
3. If there is a brief-*.md or today's daily note in this folder, put its top three to-dos on the board in hq/tasks.md as "- [ ]" lines. If not, ask me for three things I am doing today.
4. Add the accessories I picked to hq/accessories.json, using only the ids in hq/ACCESSORIES.md. Place them with "near" (a teammate's name) or "spot" (lounge, pantry, entrance, back-left and so on).
5. Start it in the background: node hq/server.mjs, then open the address it prints in my browser.

When you are done, tell me the address, how to start it again tomorrow, and remember this rule: when I say "add a ___ to the office", you edit hq/accessories.json and I watch it appear.

To check it worked: the page opens, every teammate sits at a desk with their name over it, and the accessories I picked are in the room.
```

## How to check it worked

The page opens, every teammate sits at a desk with their name over it, and the accessories you picked are in the room.
