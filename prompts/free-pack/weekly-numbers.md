# Weekly numbers one-pager

From a pasted or CSV set of sales rows, writes a one-page HTML with this week vs last week.

## The prompt

Paste this into Claude Code.

```
I want a one-page report comparing this week's sales to last week's.

Ask me one thing first: do I have a CSV file of sales rows to point you to, or should I paste the rows in directly (date, amount, and whatever else I have, like item or customer).

Once you have the rows, split them into this week and last week by date, then write a single self-contained file called "weekly-numbers.html" that shows, in plain readable HTML with basic styling (no build tools, it must open by double-clicking):
1. Total sales this week vs last week, and the percent change.
2. Number of sales (transactions) this week vs last week.
3. The best day this week and the worst day this week.
4. Top 3 items or customers this week if that data is in the rows.

Use plain numbers, peso sign if the amounts look like pesos, and one simple color to mark up or down. No jargon, no unexplained charts.

When it is done, tell me the file path and open it if you can, or tell me to double-click it.

To check it worked: open weekly-numbers.html in your browser and confirm the this-week and last-week totals actually match what you expected from your own memory of the week.
```

## How to check it worked

Open weekly-numbers.html in your browser and confirm the this-week and last-week totals actually match what you expected from your own memory of the week.
