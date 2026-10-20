import re

from django.contrib.auth.models import User
from django.db import models


class Project(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=120)
    key = models.CharField(max_length=12)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(fields=['owner', 'key'], name='unique_project_key_per_owner'),
        ]

    def __str__(self):
        return f'{self.key} {self.name}'


class Label(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='labels')
    name = models.CharField(max_length=40)
    color = models.CharField(max_length=7, default='#c4532a')

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(fields=['project', 'name'], name='unique_label_name_per_project'),
        ]

    def __str__(self):
        return self.name


class Area(models.Model):
    """A component of a project, such as the editor or the API."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='areas')
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(fields=['project', 'name'], name='unique_area_name_per_project'),
        ]

    def __str__(self):
        return self.name


class Milestone(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='milestones')
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    due_on = models.DateField(null=True, blank=True)
    closed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['closed', 'due_on', 'name']

    def __str__(self):
        return self.name


class Issue(models.Model):
    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'In progress'
        RESOLVED = 'resolved', 'Resolved'
        CLOSED = 'closed', 'Closed'

    class Severity(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='issues')
    number = models.PositiveIntegerField()
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MEDIUM)
    labels = models.ManyToManyField(Label, blank=True, related_name='issues')
    milestone = models.ForeignKey(
        Milestone,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='issues',
    )
    area = models.ForeignKey(
        Area,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='issues',
    )
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reported_issues')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        constraints = [
            models.UniqueConstraint(fields=['project', 'number'], name='unique_issue_number_per_project'),
        ]
        indexes = [
            models.Index(fields=['project', 'status']),
        ]

    def __str__(self):
        return f'{self.project.key}-{self.number} {self.title}'

    @property
    def display_key(self):
        return f'{self.project.key}-{self.number}'


class IssueLink(models.Model):
    class Kind(models.TextChoices):
        BLOCKS = 'blocks', 'Blocks'
        RELATES = 'relates', 'Relates'

    source = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='outgoing_links')
    target = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='incoming_links')
    kind = models.CharField(max_length=20, choices=Kind.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['source', 'target', 'kind'], name='unique_issue_link'),
            models.CheckConstraint(condition=~models.Q(source=models.F('target')), name='issue_link_not_self'),
        ]

    def __str__(self):
        return f'{self.source_id} {self.kind} {self.target_id}'


class Comment(models.Model):
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Comment on {self.issue_id}'


class IssueTemplate(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='templates')
    name = models.CharField(max_length=80)
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    severity = models.CharField(max_length=20, choices=Issue.Severity.choices, default=Issue.Severity.MEDIUM)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(fields=['project', 'name'], name='unique_template_name_per_project'),
        ]

    def __str__(self):
        return self.name


class SavedFilter(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_filters')
    name = models.CharField(max_length=80)
    search = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, blank=True)
    severity = models.CharField(max_length=20, blank=True)
    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.CASCADE, related_name='saved_filters')
    milestone = models.ForeignKey(Milestone, null=True, blank=True, on_delete=models.CASCADE, related_name='saved_filters')
    label = models.ForeignKey(Label, null=True, blank=True, on_delete=models.CASCADE, related_name='saved_filters')
    area = models.ForeignKey(Area, null=True, blank=True, on_delete=models.CASCADE, related_name='saved_filters')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(fields=['owner', 'name'], name='unique_saved_filter_name_per_owner'),
        ]

    def __str__(self):
        return self.name


class Activity(models.Model):
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='activities')
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    kind = models.CharField(max_length=40)
    detail = models.CharField(max_length=240, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.kind} on {self.issue_id}'


def clean_project_key(name: str, explicit: str | None) -> str:
    if explicit is not None and str(explicit).strip():
        raw = str(explicit).strip().upper()
        if not re.fullmatch(r'[A-Z][A-Z0-9]{1,11}', raw):
            return ''
        return raw
    raw = re.sub(r'[^A-Za-z0-9]', '', name).upper()[:12]
    if not raw or raw[0].isdigit() or len(raw) < 2:
        raw = re.sub(r'[^A-Za-z0-9]', '', f'P{name}').upper()[:12]
    if not re.fullmatch(r'[A-Z][A-Z0-9]{1,11}', raw or ''):
        return 'PR'
    return raw
