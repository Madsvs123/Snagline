from .colors import LABEL_PALETTE
from .models import Label, Project

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


def create_default_project(owner) -> Project:
    project = Project.objects.create(
        owner=owner,
        name='Inbox',
        key='INBOX',
        description='Default project for defects and tasks.',
    )
    seed_default_labels(project)
    return project
