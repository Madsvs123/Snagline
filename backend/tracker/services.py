from django.db.models import Max

from .colors import LABEL_PALETTE
from .models import Issue, Label, Project

_PALETTE = {item['name']: item['hex'] for item in LABEL_PALETTE}

DEFAULT_LABELS = (
    ('bug', _PALETTE['clay']),
    ('task', _PALETTE['sea']),
    ('improvement', _PALETTE['pine']),
)


def seed_default_labels(project: Project) -> None:
    Label.objects.bulk_create(
        [Label(project=project, name=name, color=color) for name, color in DEFAULT_LABELS]
    )


def next_issue_number(project: Project) -> int:
    last_number = Issue.objects.filter(project=project).aggregate(highest=Max('number'))['highest'] or 0
    return last_number + 1


def create_default_project(owner) -> Project:
    project = Project.objects.create(
        owner=owner,
        name='Inbox',
        key='INBOX',
        description='Default project for defects and tasks.',
    )
    seed_default_labels(project)
    return project
