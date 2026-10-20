from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from tracker.models import Activity, Area, Issue, Milestone, Project
from tracker.services import next_issue_number


class Command(BaseCommand):
    help = 'Create an issue on one of your projects.'

    def add_arguments(self, parser):
        parser.add_argument('title')
        parser.add_argument('--project', required=True, help='Project key, such as INBOX.')
        parser.add_argument('--body', default='', help='Description of the defect or task.')
        parser.add_argument('--severity', default=Issue.Severity.MEDIUM, choices=list(Issue.Severity.values))
        parser.add_argument('--status', default=Issue.Status.OPEN, choices=list(Issue.Status.values))
        parser.add_argument('--owner', default='', help='Username. Required when more than one account exists.')
        parser.add_argument('--area', default='', help='Area name on the project.')
        parser.add_argument('--milestone', default='', help='Milestone name on the project.')

    def handle(self, *args, **options):
        title = options['title'].strip()
        if len(title) < 3:
            raise CommandError('Use at least 3 characters for the title.')
        owner = self._owner(options['owner'])
        key = options['project'].strip()
        project = Project.objects.filter(owner=owner, key__iexact=key).first()
        if project is None:
            raise CommandError(f'No project with key {key} for {owner.username}.')
        issue = Issue.objects.create(
            project=project,
            number=next_issue_number(project),
            title=title,
            body=options['body'],
            status=options['status'],
            severity=options['severity'],
            area=self._named(Area, project, options['area'], 'area'),
            milestone=self._named(Milestone, project, options['milestone'], 'milestone'),
            reporter=owner,
        )
        Activity.objects.create(
            issue=issue,
            actor=owner,
            kind='created',
            detail=f'Opened {issue.display_key}',
        )
        self.stdout.write(self.style.SUCCESS(f'Created {issue.display_key}: {issue.title}'))

    def _owner(self, username: str):
        username = username.strip()
        if username:
            try:
                return User.objects.get(username=username)
            except User.DoesNotExist as exc:
                raise CommandError(f'No user named {username}.') from exc
        users = User.objects.order_by('id')
        count = users.count()
        if count == 1:
            return users.get()
        if count == 0:
            raise CommandError('Register an owner before creating an issue.')
        raise CommandError('Pass --owner when more than one account exists.')

    def _named(self, model, project, name: str, label: str):
        name = name.strip()
        if not name:
            return None
        match = model.objects.filter(project=project, name__iexact=name).first()
        if match is None:
            raise CommandError(f'No {label} named {name} on {project.key}.')
        return match
