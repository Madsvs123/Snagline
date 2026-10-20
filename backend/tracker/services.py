from .models import Label, Project

DEFAULT_LABELS = (
    ('bug', '#c4532a'),
    ('task', '#2a6f97'),
    ('improvement', '#2f7d4a'),
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
