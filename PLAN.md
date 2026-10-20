# Further tracker work

Snagline is a tracker for one owner. Areas, links, templates, saved filters, bulk status, label colors, milestone progress, duplicate-title warnings, CSV export, comment edits, activity, severity counts, search, and `manage.py issue` are in place. The notes below are the next pieces worth building. They stay inside that single workspace.

## Triage

- Snooze an issue until a date, then bring it back to open.
- Mark a row in the issue list when an open issue still blocks it.
- Let a saved filter store a milestone and a label, and keep the active filter in the address bar.
- Add a review page that lists open critical and high issues ahead of everything else.

## Writing

- Render issue descriptions and comments as Markdown.
- Allow a template to leave blanks, such as the area name, that the new-issue form fills in.
- Warn when a new title is close to an existing one, not only when it matches exactly.
- Quote an earlier comment while writing a follow-up.

## Milestones and history

- Give an issue its own due date, separate from the milestone date.
- Ask for confirmation before closing a milestone that still has open issues.
- Draft a short changelog from the issues resolved in a milestone.
- Chart severity changes over time from the activity trail.

## Files and review

- Attach a screenshot or a log to an issue and keep it with the project.
- Import a CSV of issues into a project, using the same columns as the export.
- Include comments in the CSV export.
- Add a print layout for a single issue.

## Shell and dashboard

- Teach `manage.py issue` to accept a label and a template name.
- Add a command that prints the open issues for a project key.
- Pin one issue to the top of the dashboard.
- Show the oldest open critical issue beside the severity counts.
